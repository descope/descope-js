// Single source of truth for the action vocabulary. Add a new entry here and
// the matching `case` to both switches below.
export const COMPONENT_ACTIONS = ['hide', 'disable', 'read-only'] as const;
export type ComponentAction = (typeof COMPONENT_ACTIONS)[number];

/** Applies a single component state to a DOM element. */
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
    // Unknown action — silently ignore. Bad actions shouldn't make it past
    // the server; if one does, we'd rather no-op than throw.
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

// Escape only the chars that would break `[id="..."]` selectors:
// double-quote (would close the quoted attribute) and backslash (would
// escape the next char). Narrower than the real CSS.escape; just enough
// for environments that don't expose it (older JSDOM, very old Safari).
const ATTR_SELECTOR_ESCAPE_PATTERN = /(["\\])/g;

// CSS.escape with the fallback above for environments that lack it.
// Exported so callers that build attribute selectors from runtime strings
// can use a single sanitizer.
export function escapeSelector(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(ATTR_SELECTOR_ESCAPE_PATTERN, '\\$1');
}

// IDs can repeat (e.g. duplicates inside dynamic-selects), so match all.
function findComponents(root: ParentNode, id: string): Element[] {
  return Array.from(root.querySelectorAll(`[id="${escapeSelector(id)}"]`));
}

/**
 * Diffs the previously-applied real-time state against the newly-computed one
 * and updates the DOM accordingly. Only touches elements whose IDs the realtime
 * layer owns, leaving everything else alone (e.g. submit buttons,
 * dynamically-disabled fields).
 *
 * - `applied`: what we applied last time (id → action).
 * - `next`: what should be applied now (id → action). Absence means no action.
 *
 * Returns a fresh copy of `next` for the caller to store.
 */
export function apply(
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
    findComponents(root, id).forEach((el) => clearAction(el, prev));
  });
  // Apply actions in `next` that weren't there or whose action changed.
  Object.keys(next).forEach((id) => {
    const upcoming = next[id];
    const prev = applied[id];
    if (upcoming === prev) return;
    findComponents(root, id).forEach((el) => applyAction(el, upcoming));
  });
  return { ...next };
}
