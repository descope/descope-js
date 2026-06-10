/**
 * Single source of truth for the events the real-time conditions mixin
 * subscribes to. We listen to both `input` and `change` because some custom
 * elements (notably descope-checkbox) dispatch `input` with the stale value
 * before their internal state updates; `change` fires with the new value.
 * The handler is idempotent, so receiving both events for one user action is
 * harmless. Swapping events is a one-line change.
 */
export const REALTIME_CONDITION_EVENTS = ['input', 'change'] as const;

/** Debounce window applied before re-evaluation runs. */
export const REALTIME_CONDITION_DEBOUNCE_MS = 50;
