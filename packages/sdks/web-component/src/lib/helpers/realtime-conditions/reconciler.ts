/**
 * Applies a single component state to a DOM element. Mirrors the actions
 * understood by helpers/templates.ts#applyComponentsState.
 */
export function applyAction(el: Element, action: string): void {
  switch (action) {
    case 'hide':
      el.classList.add('hidden');
      break;
    case 'disable':
      el.setAttribute('disabled', 'true');
      break;
    case 'read-only':
      el.setAttribute('readonly', 'true');
      break;
    default:
    // Unknown action — silently ignore. Mirrors today's applyComponentsState
    // behavior, which logs an error and skips.
  }
}

/** Removes a previously-applied action from a DOM element. */
export function clearAction(el: Element, action: string): void {
  switch (action) {
    case 'hide':
      el.classList.remove('hidden');
      break;
    case 'disable':
      el.removeAttribute('disabled');
      break;
    case 'read-only':
      el.removeAttribute('readonly');
      break;
    default:
    // no-op
  }
}

function escapeId(id: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(id);
  }
  return id.replace(/(["\\])/g, '\\$1');
}

function findComponent(root: ParentNode, id: string): Element | null {
  return root.querySelector(`[id="${escapeId(id)}"]`);
}

/**
 * Reconciles the previously-applied real-time state against the newly-computed
 * one. Only touches DOM elements whose IDs the realtime layer owns, leaving
 * everything else alone (e.g. submit buttons, dynamically-disabled fields).
 *
 * - `applied`: what we applied last time (id → action).
 * - `next`: what should be applied now (id → action). Absence means no action.
 *
 * Returns a fresh copy of `next` for the caller to store.
 */
export function reconcile(
  root: ParentNode,
  applied: Record<string, string>,
  next: Record<string, string>,
): Record<string, string> {
  // Clear actions that were applied previously but aren't in `next` (or whose
  // action changed).
  Object.keys(applied).forEach((id) => {
    const prev = applied[id];
    const upcoming = next[id];
    if (upcoming === prev) return;
    const el = findComponent(root, id);
    if (el) clearAction(el, prev);
  });
  // Apply actions in `next` that weren't there or whose action changed.
  Object.keys(next).forEach((id) => {
    const upcoming = next[id];
    const prev = applied[id];
    if (upcoming === prev) return;
    const el = findComponent(root, id);
    if (el) applyAction(el, upcoming);
  });
  return { ...next };
}
