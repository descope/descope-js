/* eslint-disable import/prefer-default-export, no-param-reassign */
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import {
  REALTIME_CONDITION_DEBOUNCE_MS,
  REALTIME_CONDITION_EVENTS,
} from '../helpers/realtime-conditions/config';
import {
  collectReferencedFormKeys,
  collectTouchedComponentIds,
  evaluateAll,
  FormSnapshot,
} from '../helpers/realtime-conditions/evaluator';
import {
  apply,
  COMPONENT_ACTIONS,
  escapeSelector,
} from '../helpers/realtime-conditions/applier';
import { DESCOPE_ATTRIBUTE_EXCLUDE_FIELD } from '../constants';
import type { RealtimeComponentsCondition, ScreenState } from '../types';

const LOG_PREFIX = 'component-conditions:';

// What the mixin needs from its host: a way to subscribe to loading state
// so input handling can pause while the next request is in flight. Defined
// as an interface (not imported) to avoid a circular dependency on BaseDescopeWc.
export interface PausableHost {
  nextRequestStatus?: {
    // subscribe returns a token; pass that token to unsubscribe — not the handler.
    subscribe: (cb: (v: { isLoading: boolean }) => void) => string;
    unsubscribe?: (token: string) => void;
  };
}

export interface RealtimeRuntime {
  conditions: RealtimeComponentsCondition[];
  // IDs of components that any rule can change
  touchedIds: Set<string>;
  // latest form values on screen
  snapshot: FormSnapshot;
  // what's currently applied on screen for touched components.
  // Compared against on each re-evaluation to know what to change.
  applied: Record<string, string>;
  // What the server told us to apply for these components. Stays fixed for
  // the screen's lifetime so we can fall back to it when a real-time rule
  // stops matching. Without this, a server-set action could disappear when
  // a real-time rule briefly fires on the same component.
  serverBaseline: Record<string, string>;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  // true while paused (during submit, to avoid stale updates)
  paused: boolean;
  unsubscribePauseListener: (() => void) | null;
  // the listener we attach to form events (kept so we can detach)
  inputHandler: (e: Event) => void;
  // the screen root we work against
  root: HTMLElement | null;
}

// Some inputs already have `name="form.x"`, others use `name="x"`. Always
// return the `form.x` form so it lines up with what rules reference.
function toFormKey(name: string): string {
  return name.startsWith('form.') ? name : `form.${name}`;
}

// Try the full `form.x` first (descope components), then `x` (plain inputs).
function findInputForFormKey(
  root: ParentNode,
  formKey: string,
): Element | null {
  const bare = formKey.startsWith('form.')
    ? formKey.slice('form.'.length)
    : formKey;
  return (
    root.querySelector(`[name="${escapeSelector(formKey)}"]`) ||
    root.querySelector(`[name="${escapeSelector(bare)}"]`)
  );
}

// Read the current value off a form input. Reads JS properties (not HTML
// attributes) so we pick up both the component's default and any value
// carried over from earlier screens.
//
// Native <input type=checkbox> needs special handling: `.value` is always
// "on", only `.checked` reflects the real state. Descope boolean components
// (descope-checkbox, descope-switch-toggle) expose `.checked` on their class.
function readInputValue(el: Element): unknown {
  if (el instanceof HTMLInputElement) {
    return el.type === 'checkbox' ? el.checked : el.value;
  }
  if ('checked' in el) {
    return (el as unknown as { checked: boolean }).checked;
  }
  if ('value' in el) {
    return (el as unknown as { value: unknown }).value;
  }
  return undefined;
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
    serverBaseline: {},
    debounceTimer: null,
    paused: false,
    unsubscribePauseListener: null,
    inputHandler: () => {},
    root: null,
  };
}

// For each touched component, pick the real-time action if a rule is firing
// for it, otherwise fall back to the server's action. Components that no rule
// touches are not in the result — those were already painted by
// applyComponentsState.
function effectiveActions(
  realtimeVerdict: Record<string, string>,
  serverBaseline: Record<string, string>,
  touchedIds: Set<string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  touchedIds.forEach((id) => {
    if (realtimeVerdict[id]) {
      out[id] = realtimeVerdict[id];
    } else if (serverBaseline[id]) {
      out[id] = serverBaseline[id];
    }
  });
  return out;
}

export const componentConditionsMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    // Pull in loggerMixin so `this.logger` is available no matter where
    // this mixin sits in the chain.
    const BaseClass = compose(loggerMixin)(superclass);

    return class ComponentConditionsMixin extends BaseClass {
      // One runtime per <descope-wc> element.
      #rtRuntime: RealtimeRuntime = emptyRuntime();

      /**
       * Apply the server's hide/disable/read-only actions to the DOM.
       * Logs unknown actions here (runs once per screen) but stays quiet on
       * the keystroke path to avoid log spam.
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
       * Set up real-time conditions for the current screen. Safe to call
       * twice — a second call rebuilds from screenState.
       *
       * Must run AFTER `updateScreenFromScreenState`, so the DOM reads below
       * see both server-shipped values and any component defaults from the
       * HTML.
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

        // screenState.form uses "phone"; rules reference "form.phone".
        // Add the prefix on the way in.
        const initialSnapshot: FormSnapshot = {};
        Object.entries(screenState?.form ?? {}).forEach(([k, v]) => {
          initialSnapshot[`form.${k}`] = v;
        });

        // For every key the rules reference, read the current DOM value.
        // Component defaults (e.g. `checked="true"` on a descope-checkbox)
        // live only in the HTML and don't make it into screenState.form, so
        // without this read the first evaluation would miss them.
        collectReferencedFormKeys(conditions).forEach((formKey) => {
          const el = findInputForFormKey(rootElement, formKey);
          if (!el) return;
          const v = readInputValue(el);
          if (v !== undefined) initialSnapshot[formKey] = v;
        });

        const touchedIds = collectTouchedComponentIds(conditions);

        // What to fall back to when a real-time rule stops matching for a
        // touched component — the actions set by server-only rules (rules
        // with no client-side conditions).
        const serverBaseline: Record<string, string> = {};
        // What's already painted on the DOM (touched components only), so
        // the first real-time evaluation can diff against the right state.
        const initialApplied: Record<string, string> = {};

        Object.entries(screenState?.componentsState ?? {}).forEach(
          ([id, action]) => {
            if (!touchedIds.has(id)) return;
            initialApplied[id] = action;
          },
        );

        Object.entries(screenState?.serverOnlyComponentsState ?? {}).forEach(
          ([id, action]) => {
            if (touchedIds.has(id)) {
              serverBaseline[id] = action;
            }
          },
        );

        const runtime: RealtimeRuntime = {
          conditions,
          touchedIds,
          snapshot: initialSnapshot,
          applied: initialApplied,
          serverBaseline,
          debounceTimer: null,
          paused: false,
          unsubscribePauseListener: null,
          inputHandler: () => {},
          root: rootElement,
        };

        // Re-run the rules now that we've read the real DOM values. The
        // server evaluated without seeing component defaults, so its
        // `componentsState` can disagree with what the user actually sees.
        // Apply the diff once before listening for input.
        const reconciled = effectiveActions(
          evaluateAll(conditions, initialSnapshot),
          serverBaseline,
          touchedIds,
        );
        if (!shallowEqualStringMap(initialApplied, reconciled)) {
          runtime.applied = apply(rootElement, initialApplied, reconciled);
        }

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

        // Pause while a /next request is in flight. Without this, a debounced
        // evaluation could run between submit and the next screen render and
        // change components that are about to be replaced — causing flicker,
        // or hiding something the next screen needs visible.
        const pauseState = (this as unknown as PausableHost).nextRequestStatus;
        if (pauseState?.subscribe) {
          const handler = ({ isLoading }: { isLoading: boolean }) => {
            runtime.paused = isLoading;
            if (isLoading && runtime.debounceTimer) {
              clearTimeout(runtime.debounceTimer);
              runtime.debounceTimer = null;
            }
          };
          // subscribe returns a token; unsubscribe needs that token, not the
          // handler. Without storing it, handlers leak across screens and
          // keep old runtimes (and their DOM roots) alive.
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

        const target = e.target as Element | null;
        if (!target) return;
        if (target.hasAttribute?.(DESCOPE_ATTRIBUTE_EXCLUDE_FIELD)) return;

        const name = target.getAttribute?.('name');
        if (!name) return;

        // Update the snapshot only — evaluation is debounced. Use readInputValue
        // so checkboxes read the same way as at mount; otherwise `target.value`
        // would be the string "on" for native checkboxes and break is-true rules.
        const key = toFormKey(name);
        runtime.snapshot[key] = readInputValue(target);

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
          next = effectiveActions(
            evaluateAll(runtime.conditions, runtime.snapshot),
            runtime.serverBaseline,
            runtime.touchedIds,
          );
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

      // Clean up listeners and timers when the host leaves the DOM. Reaches
      // us only if BaseDescopeWc calls `super.disconnectedCallback?.()`;
      // otherwise teardown happens lazily on the next initRealtimeConditions.
      disconnectedCallback() {
        // disconnectedCallback isn't on HTMLElement in the lib types, but it
        // exists at runtime — forward into super in case the chain uses it.
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
          // Undo anything we applied so the next screen starts clean. Skip
          // if the root is already gone (replaced by the next screen) —
          // nothing left to undo.
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
