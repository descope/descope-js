// Applies server-computed component conditions (hide / disable / read-only) to a
// widget's DOM. Mirrors the flow web-component applier, but targets widget
// components by their `data-id` (widgets address components that way) and hides
// via inline style + the `hidden` attribute rather than a `.hidden` class, which
// widgets do not inject into their shadow DOM.

export const COMPONENT_ACTIONS = ['hide', 'disable', 'read-only'] as const;
export type ComponentAction = (typeof COMPONENT_ACTIONS)[number];

const ATTR_SELECTOR_ESCAPE_PATTERN = /(["\\])/g;

// CSS.escape with a narrow fallback for environments that lack it.
function escapeSelector(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(ATTR_SELECTOR_ESCAPE_PATTERN, '\\$1');
}

// IDs can repeat, so match all.
function findComponents(root: ParentNode, id: string): Element[] {
  return Array.from(root.querySelectorAll(`[data-id="${escapeSelector(id)}"]`));
}

function applyAction(el: Element, action: string): void {
  switch (action) {
    case 'hide':
      el.setAttribute('hidden', '');
      (el as HTMLElement).style?.setProperty('display', 'none', 'important');
      break;
    case 'disable':
      el.setAttribute('disabled', 'true');
      break;
    case 'read-only':
      el.setAttribute('readonly', 'true');
      break;
    default:
    // Unknown action - ignore. A bad action shouldn't make it past the server.
  }
}

function clearAction(el: Element, action: string): void {
  switch (action) {
    case 'hide':
      el.removeAttribute('hidden');
      (el as HTMLElement).style?.removeProperty('display');
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

/** Applies the componentId -> action map to the matching elements under root. */
export function applyComponentsState(
  root: ParentNode | null | undefined,
  componentsState: Record<string, string> | undefined,
): void {
  if (!root || !componentsState) return;
  Object.entries(componentsState).forEach(([id, action]) => {
    findComponents(root, id).forEach((el) => applyAction(el, action));
  });
}

/** Reverts a previously-applied componentId -> action map. */
export function clearComponentsState(
  root: ParentNode | null | undefined,
  componentsState: Record<string, string> | undefined,
): void {
  if (!root || !componentsState) return;
  Object.entries(componentsState).forEach(([id, action]) => {
    findComponents(root, id).forEach((el) => clearAction(el, action));
  });
}
