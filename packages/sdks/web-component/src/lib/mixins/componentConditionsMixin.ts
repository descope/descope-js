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
  // last-applied real-time state map (id → action). Tracks the effective
  // action currently on the DOM for components the realtime layer touches —
  // server baseline if no realtime CC is firing for that id, realtime's
  // verdict if one is. Diffed against on each re-evaluation.
  applied: Record<string, string>;
  // Snapshot of server-applied actions for components the realtime layer
  // touches. Kept immutable for the screen's lifetime so we can restore the
  // server's verdict on any touched component when its realtime CC stops
  // firing. Without this, server-only actions would silently disappear once
  // a sibling realtime CC fires + stops on the same component.
  serverBaseline: Record<string, string>;
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

// Find the DOM element for a form key — try the full key first (descope
// components), then the bare suffix (plain inputs).
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

// Read the current value off a form input. Called after the screen has been
// mounted AND `updateScreenFromScreenState` has populated .value/.checked from
// any carried form context, so JS properties are authoritative here — both
// component defaults (parsed from HTML attributes by the element's own
// connectedCallback) and cross-screen carried values (written via the .value
// property after mount) are visible to us.
//
// `'checked' in el` distinguishes Descope's boolean custom elements
// (descope-checkbox, descope-switch-toggle) from non-boolean ones — their
// classes define `checked` as an instance property, others don't. Native
// <input> is handled separately because for type=checkbox, `.value` is the
// string "on" regardless of state — only `.checked` reflects the real state.
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

// Merges the realtime layer's per-eval verdict with the server's baseline
// for components the realtime layer touches. Realtime wins where it fires;
// server baseline fills in for touched components where realtime doesn't fire.
// Untouched components (not in touchedIds) are not in the result — those
// belong purely to the server baseline and applyComponentsState already
// painted them.
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
       * Must be called AFTER `updateScreenFromScreenState` (see the call site
       * in DescopeWc.ts, inside the post-replaceChildren setTimeout). By that
       * point each input's `.value` / `.checked` reflects both server-shipped
       * form context and component-default attributes, so the DOM read below
       * is authoritative.
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

        // Overlay DOM values for every form key the rules reference. Component
        // defaults (e.g. `checked="true"` on a descope-checkbox) live only on
        // the rendered HTML — they never reach the server's execution context,
        // so screenState.form often misses them. Reading the DOM here — after
        // updateScreenFromScreenState has run — lets the first eval below see
        // what the user actually sees.
        collectReferencedFormKeys(conditions).forEach((formKey) => {
          const el = findInputForFormKey(rootElement, formKey);
          if (!el) return;
          const v = readInputValue(el);
          if (v !== undefined) initialSnapshot[formKey] = v;
        });

        const touchedIds = collectTouchedComponentIds(conditions);

        // serverBaseline is the fallback action the realtime layer restores
        // when a realtime CC stops firing on a touched component.
        //
        // Preferred source: `screenState.serverOnlyComponentsState`, shipped
        // explicitly by the new BE. It carries the per-component verdict of
        // SERVER-ONLY CCs only, computed during the same BE pass that
        // produced `componentsState` (which is the full last-wins-over-all
        // verdict). We filter to touched ids so the runtime ignores any
        // entries for components the realtime layer doesn't own.
        //
        // Fallback for old backends that don't ship the explicit field:
        // infer by exclusion — for each touched component, the server's
        // contribution is `componentsState[id]` UNLESS a realtime CC for
        // that id has the same action (in which case the realtime CC is
        // the likely source of the value, and we don't treat the baseline
        // as restorable). The heuristic approximates the new-BE behavior
        // and matches what this SDK has done historically; it has one
        // known gap that new-BE/new-SDK closes — when a server-only CC
        // and a realtime CC happen to have the same action for the same
        // id, the heuristic excludes the id and a later "realtime stops
        // firing" event can drop the action even though the server-only
        // CC still considers it applied. New BEs prevent the same-action
        // collision from shipping in the first place (same-action prune
        // + later-server-only prune), so this gap only matters during the
        // transient old-BE/new-SDK rollout window.
        const serverBaseline: Record<string, string> = {};
        // initialApplied mirrors what applyComponentsState already painted
        // on the DOM (filtered to touched ids), so the diff against the
        // first realtime evaluation correctly replaces or clears it.
        const initialApplied: Record<string, string> = {};

        Object.entries(screenState?.componentsState ?? {}).forEach(
          ([id, action]) => {
            if (!touchedIds.has(id)) return;
            initialApplied[id] = action;
          },
        );

        if (screenState?.serverOnlyComponentsState) {
          Object.entries(screenState.serverOnlyComponentsState).forEach(
            ([id, action]) => {
              if (touchedIds.has(id)) {
                serverBaseline[id] = action;
              }
            },
          );
        } else {
          // Legacy heuristic: derive from componentsState by excluding
          // entries whose action matches a realtime CC's action for the
          // same id (treats those as realtime-owned).
          Object.entries(screenState?.componentsState ?? {}).forEach(
            ([id, action]) => {
              if (!touchedIds.has(id)) return;
              const realtimeMatchesServerAction = conditions.some(
                (c) => c.componentIds?.includes(id) && c.action === action,
              );
              if (!realtimeMatchesServerAction) {
                serverBaseline[id] = action;
              }
            },
          );
        }

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

        // Reconcile baseline against the DOM-corrected snapshot. The server
        // evaluated against an empty execution context (component defaults
        // don't reach it), so its `componentsState` can disagree with what
        // the user actually sees. Re-evaluate once and apply the diff.
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

        // When the user clicks submit, DescopeWc fires a /next request. If we
        // let the debounced evaluator run while that request is in flight, it
        // could apply stale condition results to a DOM that the next-screen
        // render is about to replace — causing visible flicker or, worse,
        // hiding a component the new screen needs visible. Subscribing to the
        // loading state lets us freeze evaluation until the response lands and
        // the new screen is mounted (which calls initRealtimeConditions fresh).
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

        const target = e.target as Element | null;
        if (!target) return;
        if (target.hasAttribute?.(DESCOPE_ATTRIBUTE_EXCLUDE_FIELD)) return;

        const name = target.getAttribute?.('name');
        if (!name) return;

        // Update snapshot only — actual eval is debounced. Use readInputValue
        // so checkboxes and Descope boolean components read the same way here
        // as in the mount-time overlay (otherwise `target.value` would be the
        // literal string "on" for native checkboxes and silently break is-true
        // rules on the first user toggle).
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
