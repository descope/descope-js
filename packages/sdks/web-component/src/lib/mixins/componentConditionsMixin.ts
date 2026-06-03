/* eslint-disable import/prefer-default-export, no-param-reassign */
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import {
  REALTIME_CONDITION_DEBOUNCE_MS,
  REALTIME_CONDITION_EVENTS,
} from '../helpers/realtime-conditions/config';
import {
  collectTouchedComponentIds,
  evaluateAll,
  FormSnapshot,
} from '../helpers/realtime-conditions/evaluator';
import {
  apply,
  COMPONENT_ACTIONS,
} from '../helpers/realtime-conditions/applier';
import { DESCOPE_ATTRIBUTE_EXCLUDE_FIELD } from '../constants';
import type { RealtimeComponentsCondition, ScreenState } from '../types';

const LOG_PREFIX = 'component-conditions:';

/**
 * Minimal interface the mixin needs from its host: a State<{isLoading}> we can
 * subscribe to so input handling pauses while a flow/next is in flight. We use
 * an interface here (rather than `any`) to avoid a circular dependency on the
 * concrete BaseDescopeWc class, which would otherwise need to be imported.
 */
export interface PausableHost {
  nextRequestStatus?: {
    // Mirrors `State<T>` in helpers/state.ts: subscribe returns a token string
    // that must be passed to unsubscribe. Passing the handler does nothing.
    subscribe: (cb: (v: { isLoading: boolean }) => void) => string;
    unsubscribe?: (token: string) => void;
  };
}

export interface RealtimeRuntime {
  conditions: RealtimeComponentsCondition[];
  // component IDs targeted by any condition group
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
  // the content root we operate on (kept for DOM lookups when applying state)
  root: HTMLElement | null;
}

// Some inputs (e.g. descope-* custom elements) render their `name` attribute
// with the full context key already prefixed by `form.`; others use a bare
// name. Normalize either to a full `form.*` context key so it matches what
// condition rules reference.
function toFormKey(name: string): string {
  return name.startsWith('form.') ? name : `form.${name}`;
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
    conditions: [],
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

export const componentConditionsMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    // Compose loggerMixin so we can use `this.logger` regardless of where this
    // mixin lands in the chain — mirrors the pattern used by other mixins in
    // `@descope/sdk-mixins`. Hosts can swap in a custom logger via the
    // `logger` setter; ours respects that.
    const BaseClass = compose(loggerMixin)(superclass);

    return class ComponentConditionsMixin extends BaseClass {
      // Per-instance state. The singleton mixin pattern in this codebase
      // assigns one mixin class per host class, but `this` is a per-element
      // host, so instance-level fields are isolated per <descope-wc>.
      #rtRuntime: RealtimeRuntime = emptyRuntime();

      /**
       * Paints the server-side baseline hide/disable/read-only state to the
       * DOM. Unknown actions are logged here (bounded — baseline runs once
       * per screen) but silently ignored on the runtime path to avoid
       * per-keystroke log spam.
       */
      applyComponentsState(
        root: ParentNode,
        componentsState: Record<string, string> | undefined,
      ): void {
        if (!componentsState) return;
        Object.entries(componentsState).forEach(([id, action]) => {
          if (!(COMPONENT_ACTIONS as readonly string[]).includes(action)) {
            this.logger.error(
              `Unknown component action "${action}" for component with id "${id}"`,
              `Valid actions are ${COMPONENT_ACTIONS.map((a) => `"${a}"`).join(
                ', ',
              )}`,
            );
          }
        });
        apply(root, {}, componentsState);
      }

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

        const conditions = screenState?.realtimeComponentsConditions ?? [];
        if (!conditions.length) {
          this.logger.debug(
            `${LOG_PREFIX} no real-time rules to apply on this screen`,
          );
          return;
        }
        this.logger.info(
          `${LOG_PREFIX} found ${conditions.length} real-time rule(s) for this screen`,
        );

        // screenState.form uses bare keys (e.g. "phone"), but condition
        // rules reference the full context key ("form.phone"). Prefix on the way in.
        const initialSnapshot: FormSnapshot = {};
        Object.entries(screenState?.form ?? {}).forEach(([k, v]) => {
          initialSnapshot[`form.${k}`] = v;
        });

        const touchedIds = collectTouchedComponentIds(conditions);

        // Seed `applied` from the baseline `componentsState` for any component
        // a condition group targets. This tells the applier "the server
        // already set this state, and we own it now" — so when the condition
        // fires for an input change, we know to clear the corresponding class
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
          conditions,
          touchedIds,
          snapshot: initialSnapshot,
          applied: initialApplied,
          debounceTimer: null,
          paused: false,
          unsubscribePauseListener: null,
          inputHandler: () => {},
          root: rootElement,
        };

        // No initial apply needed: the baseline `componentsState` was already
        // applied to the DOM by `applyComponentsState`, and we've recorded
        // that state in `applied` above. The applier runs on the next input
        // event and diffs against `applied`.

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
          // `State<T>.subscribe` returns a token string; `unsubscribe` expects
          // that token, NOT the handler. Without storing/using the token,
          // handlers accumulate across screen transitions and keep old
          // runtimes (and their DOM roots) alive.
          const token = pauseState.subscribe(handler);
          runtime.unsubscribePauseListener = () => {
            if (token !== undefined && token !== null) {
              pauseState.unsubscribe?.(token);
            }
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
          next = evaluateAll(runtime.conditions, runtime.snapshot);
        } catch (e) {
          this.logger.error(
            `${LOG_PREFIX} failed to evaluate real-time rules — keeping the previous state`,
            (e as Error)?.message,
          );
          return;
        }

        const prevApplied = runtime.applied;
        if (shallowEqualStringMap(prevApplied, next)) return;

        this.logger.debug(
          `${LOG_PREFIX} form changed — updating components: was ${JSON.stringify(
            prevApplied,
          )}, now ${JSON.stringify(next)}`,
        );
        runtime.applied = apply(runtime.root, prevApplied, next);
      }

      // Release the pause subscription and any pending debounce when the host
      // leaves the DOM. We still call super so the chain isn't broken below
      // us — even though no other mixin in the chain currently implements
      // this hook, future additions shouldn't be silently dropped.
      //
      // Note: this only fires when the host's disconnectedCallback chains
      // into super. BaseDescopeWc must call `super.disconnectedCallback?.()`
      // for this to reach us in production — otherwise teardown relies on
      // the next `initRealtimeConditions` call clearing the previous runtime.
      disconnectedCallback() {
        // `disconnectedCallback` isn't declared on HTMLElement in this lib's
        // types, but it IS a custom-element lifecycle method that exists at
        // runtime. Forward into super so any future mixin in the chain that
        // adds one runs first.
        // @ts-expect-error custom-element lifecycle method missing from lib types
        super.disconnectedCallback?.();
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
            apply(r.root, r.applied, {});
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
