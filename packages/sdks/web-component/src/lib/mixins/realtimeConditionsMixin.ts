/* eslint-disable import/prefer-default-export, no-param-reassign */
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import {
  REALTIME_CONDITION_DEBOUNCE_MS,
  REALTIME_CONDITION_EVENTS,
} from '../helpers/realtime-conditions/config';
import {
  buildDependencyIndex,
  collectTouchedComponentIds,
  evaluateAll,
  FormSnapshot,
  ValidityChecker,
} from '../helpers/realtime-conditions/evaluator';
import { reconcile } from '../helpers/realtime-conditions/reconciler';
import { DESCOPE_ATTRIBUTE_EXCLUDE_FIELD } from '../constants';
import type { RealtimeComponentsCondition, ScreenState } from '../types';

const LOG_PREFIX = 'realtime-conditions:';

/**
 * Minimal interface the mixin needs from its host: a State<{isLoading}> we can
 * subscribe to so input handling pauses while a flow/next is in flight. We use
 * an interface here (rather than `any`) to avoid a circular dependency on the
 * concrete BaseDescopeWc class, which would otherwise need to be imported.
 */
export interface PausableHost {
  nextRequestStatus?: {
    subscribe: (cb: (v: { isLoading: boolean }) => void) => void;
    unsubscribe?: (cb: (v: { isLoading: boolean }) => void) => void;
  };
}

export interface RealtimeRuntime {
  residuals: RealtimeComponentsCondition[];
  // form key → set of residual indices that reference it
  dependencyIndex: Map<string, Set<number>>;
  // component IDs that any residual targets
  touchedIds: Set<string>;
  // current in-memory snapshot of on-screen form values
  snapshot: FormSnapshot;
  // last-applied real-time state map (id → action)
  applied: Record<string, string>;
  // debounce timer
  debounceTimer: ReturnType<typeof setTimeout> | null;
  // whether input events are currently ignored (during submit)
  paused: boolean;
  // unsubscribe from nextRequestStatus, if subscribed
  unsubscribePauseListener: (() => void) | null;
  // bound input listener (one ref per screen so we can detach if needed)
  inputHandler: (e: Event) => void;
  // the content root we operate on (kept for reconciler lookups)
  root: HTMLElement | null;
}

function escapeAttr(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/(["\\])/g, '\\$1');
}

// Some inputs (e.g. descope-* custom elements) render their `name` attribute
// with the full context key already prefixed by `form.`; others use a bare
// name. Normalize either to a full `form.*` context key so it matches what
// rule residuals reference.
function toFormKey(name: string): string {
  return name.startsWith('form.') ? name : `form.${name}`;
}

function makeValidityChecker(root: HTMLElement): ValidityChecker {
  return (formKey: string) => {
    // Try matching by the full key first (descope components), then fall back
    // to the bare suffix for inputs that store a bare name.
    const bare = formKey.startsWith('form.')
      ? formKey.slice('form.'.length)
      : formKey;
    const el = (root.querySelector(`[name="${escapeAttr(formKey)}"]`) ||
      root.querySelector(
        `[name="${escapeAttr(bare)}"]`,
      )) as HTMLInputElement | null;
    if (!el) return undefined;
    if (typeof el.checkValidity === 'function') {
      return el.checkValidity();
    }
    return undefined;
  };
}

function shallowEqualStringMap(
  a: Record<string, string>,
  b: Record<string, string>,
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => a[k] === b[k]);
}

function emptyRuntime(): RealtimeRuntime {
  return {
    residuals: [],
    dependencyIndex: new Map(),
    touchedIds: new Set(),
    snapshot: {},
    applied: {},
    debounceTimer: null,
    paused: false,
    unsubscribePauseListener: null,
    inputHandler: () => {},
    root: null,
  };
}

export const realtimeConditionsMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    // Compose loggerMixin so we can use `this.logger` regardless of where this
    // mixin lands in the chain — mirrors the pattern used by other mixins in
    // `@descope/sdk-mixins`. Hosts can swap in a custom logger via the
    // `logger` setter; ours respects that.
    const BaseClass = compose(loggerMixin)(superclass);

    return class RealtimeConditionsMixin extends BaseClass {
      // Per-instance state. The singleton mixin pattern in this codebase
      // assigns one mixin class per host class, but `this` is a per-element
      // host, so instance-level fields are isolated per <descope-wc>.
      #rtRuntime: RealtimeRuntime = emptyRuntime();

      /**
       * Initializes (or re-initializes) the real-time conditions layer for the
       * current screen. Idempotent: calling twice on the same screen rebuilds
       * the index from `screenState`.
       *
       * Reads the initial form snapshot from `screenState.form` rather than
       * the DOM, to avoid the race with `updateScreenFromScreenState`.
       */
      initRealtimeConditions(
        rootElement: HTMLElement,
        screenState: ScreenState | undefined,
      ): void {
        this.#teardownRealtimeRuntime();

        const residuals = screenState?.realtimeComponentsConditions ?? [];
        if (!residuals.length) {
          this.logger.debug(
            `${LOG_PREFIX} no real-time rules to apply on this screen`,
          );
          return;
        }
        this.logger.info(
          `${LOG_PREFIX} found ${residuals.length} real-time rule(s) for this screen`,
        );

        // screenState.form uses bare keys (e.g. "phone"), but residuals
        // reference the full context key ("form.phone"). Prefix on the way in.
        const initialSnapshot: FormSnapshot = {};
        Object.entries(screenState?.form ?? {}).forEach(([k, v]) => {
          initialSnapshot[`form.${k}`] = v;
        });

        const touchedIds = collectTouchedComponentIds(residuals);

        // Seed `applied` from the baseline `componentsState` for any component
        // a residual targets. This tells the reconciler "the server already
        // applied this state, and we own it now" — so when the residual stops
        // firing for an input change, we know to clear the corresponding class
        // / attribute. Without this seed, the baseline-applied `.hidden` would
        // stay forever after the user toggles the controlling input.
        const initialApplied: Record<string, string> = {};
        Object.entries(screenState?.componentsState ?? {}).forEach(
          ([id, action]) => {
            if (touchedIds.has(id)) {
              initialApplied[id] = action;
            }
          },
        );

        const runtime: RealtimeRuntime = {
          residuals,
          dependencyIndex: buildDependencyIndex(residuals),
          touchedIds,
          snapshot: initialSnapshot,
          applied: initialApplied,
          debounceTimer: null,
          paused: false,
          unsubscribePauseListener: null,
          inputHandler: () => {},
          root: rootElement,
        };

        // No initial reconcile needed: the baseline `componentsState` was
        // already applied to the DOM by `applyComponentsState`, and we've
        // recorded that state in `applied` above. The reconciler runs on the
        // next input event and diffs against `applied`.

        runtime.inputHandler = (e: Event) =>
          this.#handleRealtimeInput(e as InputEvent);

        REALTIME_CONDITION_EVENTS.forEach((ev) => {
          rootElement.addEventListener(ev, runtime.inputHandler, true);
        });
        this.logger.debug(
          `${LOG_PREFIX} listening for "${REALTIME_CONDITION_EVENTS.join(
            '" and "',
          )}" events on form fields; ${
            Object.keys(initialApplied).length
          } component(s) start hidden / disabled / read-only by these rules`,
        );

        // Pause input handling while flow/next is in flight.
        const pauseState = (this as unknown as PausableHost).nextRequestStatus;
        if (pauseState?.subscribe) {
          const handler = ({ isLoading }: { isLoading: boolean }) => {
            runtime.paused = isLoading;
            if (isLoading && runtime.debounceTimer) {
              clearTimeout(runtime.debounceTimer);
              runtime.debounceTimer = null;
            }
          };
          pauseState.subscribe(handler);
          runtime.unsubscribePauseListener = () => {
            pauseState.unsubscribe?.(handler);
          };
        }

        this.#rtRuntime = runtime;
      }

      #handleRealtimeInput(e: InputEvent): void {
        const runtime = this.#rtRuntime;
        if (!runtime.root || runtime.paused) return;

        const target = e.target as HTMLInputElement | null;
        if (!target) return;
        if (target.hasAttribute?.(DESCOPE_ATTRIBUTE_EXCLUDE_FIELD)) return;

        const name = target.getAttribute?.('name');
        if (!name) return;

        // Update snapshot only — actual eval is debounced.
        const key = toFormKey(name);
        runtime.snapshot[key] = target.value;

        if (runtime.debounceTimer) {
          clearTimeout(runtime.debounceTimer);
        }
        runtime.debounceTimer = setTimeout(() => {
          runtime.debounceTimer = null;
          this.#reEvaluateRealtime();
        }, REALTIME_CONDITION_DEBOUNCE_MS);
      }

      #reEvaluateRealtime(): void {
        const runtime = this.#rtRuntime;
        if (!runtime.root) return;

        let next: Record<string, string>;
        try {
          next = evaluateAll(
            runtime.residuals,
            runtime.snapshot,
            makeValidityChecker(runtime.root),
          );
        } catch (e) {
          this.logger.error(
            `${LOG_PREFIX} failed to evaluate real-time rules — keeping the previous state`,
            (e as Error)?.message,
          );
          return;
        }

        const prevApplied = runtime.applied;
        const changed = !shallowEqualStringMap(prevApplied, next);
        if (changed) {
          this.logger.debug(
            `${LOG_PREFIX} form changed — updating components: was ${JSON.stringify(
              prevApplied,
            )}, now ${JSON.stringify(next)}`,
          );
        }
        runtime.applied = reconcile(runtime.root, prevApplied, next);
      }

      // Release the pause subscription and any pending debounce when the host
      // leaves the DOM. No other mixin in the chain currently implements this
      // lifecycle hook, so we don't forward into super.
      disconnectedCallback() {
        this.#teardownRealtimeRuntime();
      }

      #teardownRealtimeRuntime(): void {
        const r = this.#rtRuntime;
        if (r.debounceTimer) {
          clearTimeout(r.debounceTimer);
        }
        if (r.unsubscribePauseListener) {
          r.unsubscribePauseListener();
        }
        if (r.root) {
          // Clear any state we applied so the next screen starts clean. Skip
          // when the root has already been swapped out (replaceChildren on a
          // new screen) — those nodes are gone and there is nothing to clear.
          if (Object.keys(r.applied).length > 0 && r.root.isConnected) {
            reconcile(r.root, r.applied, {});
          }
          REALTIME_CONDITION_EVENTS.forEach((ev) => {
            r.root!.removeEventListener(ev, r.inputHandler, true);
          });
        }
        this.#rtRuntime = emptyRuntime();
      }
    };
  },
);
