import '@testing-library/jest-dom';
import {
  apply,
  applyAction,
  clearAction,
  isHiddenByCondition,
} from '../applier';

function mkEl(id: string, tag = 'div'): HTMLElement {
  const el = document.createElement(tag);
  el.id = id;
  document.body.appendChild(el);
  return el;
}

describe('applyAction / clearAction', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('applies and clears hide', () => {
    const el = mkEl('a');
    applyAction(el, 'hide');
    expect(el).toHaveClass('hidden');
    clearAction(el, 'hide');
    expect(el).not.toHaveClass('hidden');
  });

  it('applies and clears disable', () => {
    const el = mkEl('a');
    applyAction(el, 'disable');
    expect(el).toHaveAttribute('disabled', 'true');
    clearAction(el, 'disable');
    expect(el).toBeEnabled();
  });

  it('applies and clears read-only', () => {
    const el = mkEl('a');
    applyAction(el, 'read-only');
    expect(el).toHaveAttribute('readonly', 'true');
    clearAction(el, 'read-only');
    expect(el).not.toHaveAttribute('readonly');
  });

  it('unknown actions are silently ignored', () => {
    const el = mkEl('a');
    applyAction(el, 'mystery');
    expect(el.classList.toString()).toBe('');
    expect(el.attributes.length).toBe(1); // just `id`
    clearAction(el, 'mystery');
  });
});

describe('apply', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('applies new state', () => {
    const a = mkEl('a');
    const b = mkEl('b');
    const next = apply(document.body, {}, { a: 'hide', b: 'disable' });
    expect(a).toHaveClass('hidden');
    expect(b).toHaveAttribute('disabled', 'true');
    expect(next).toEqual({ a: 'hide', b: 'disable' });
  });

  it('clears state no longer present', () => {
    const a = mkEl('a');
    applyAction(a, 'hide');
    const next = apply(document.body, { a: 'hide' }, {});
    expect(a).not.toHaveClass('hidden');
    expect(next).toEqual({});
  });

  it('handles action changes for the same id', () => {
    const a = mkEl('a');
    applyAction(a, 'hide');
    const next = apply(document.body, { a: 'hide' }, { a: 'disable' });
    expect(a).not.toHaveClass('hidden');
    expect(a).toHaveAttribute('disabled', 'true');
    expect(next).toEqual({ a: 'disable' });
  });

  it('is a no-op when applied and next agree', () => {
    const a = mkEl('a');
    applyAction(a, 'hide');
    const before = a.outerHTML;
    apply(document.body, { a: 'hide' }, { a: 'hide' });
    expect(a.outerHTML).toBe(before);
  });

  it('does not touch components outside the maps', () => {
    const a = mkEl('a');
    const other = mkEl('other');
    other.classList.add('hidden');
    apply(document.body, {}, { a: 'hide' });
    expect(a).toHaveClass('hidden');
    expect(other).toHaveClass('hidden'); // untouched
  });

  it('silently skips components missing from the DOM', () => {
    expect(() => apply(document.body, {}, { ghost: 'hide' })).not.toThrow();
  });

  // Templates can emit multiple elements with the same id (e.g. inside
  // dynamic-selects); the baseline `applyComponentsState` iterates them all
  // with querySelectorAll. The applier must match that, or stragglers stay
  // stuck on whatever the server applied.
  it('applies and clears actions on every element sharing an id', () => {
    const a1 = mkEl('a');
    const a2 = mkEl('a');
    const a3 = mkEl('a');

    apply(document.body, {}, { a: 'hide' });
    expect(a1).toHaveClass('hidden');
    expect(a2).toHaveClass('hidden');
    expect(a3).toHaveClass('hidden');

    apply(document.body, { a: 'hide' }, {});
    expect(a1).not.toHaveClass('hidden');
    expect(a2).not.toHaveClass('hidden');
    expect(a3).not.toHaveClass('hidden');
  });
});

// Regression for descope/etc#19151. A condition can target a container rather
// than the input, and then the input keeps a clean class list while being
// invisible. Callers that decide whether to validate need to see that.
describe('isHiddenByCondition', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  // Build `root > ...chain > input` and return both ends.
  const build = (depth: number) => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    let cursor: HTMLElement = root;
    const chain: HTMLElement[] = [];
    for (let i = 0; i < depth; i += 1) {
      const box = document.createElement('div');
      cursor.appendChild(box);
      chain.push(box);
      cursor = box;
    }
    const input = document.createElement('input');
    input.name = 'zip';
    cursor.appendChild(input);
    return { root, chain, input };
  };

  it('is false when nothing is hidden', () => {
    const { root, input } = build(1);
    expect(isHiddenByCondition(input, root)).toBe(false);
  });

  it('is true when the element itself is hidden', () => {
    const { root, input } = build(1);
    applyAction(input, 'hide');
    expect(isHiddenByCondition(input, root)).toBe(true);
  });

  it('is true when the container around it is hidden', () => {
    const { root, chain, input } = build(1);
    applyAction(chain[0], 'hide');
    expect(input).not.toHaveClass('hidden');
    expect(isHiddenByCondition(input, root)).toBe(true);
  });

  it('is true for a hidden container several levels up', () => {
    const { root, chain, input } = build(3);
    applyAction(chain[0], 'hide');
    expect(isHiddenByCondition(input, root)).toBe(true);
  });

  // The screen root gets the same class while a custom screen is showing.
  // Treating that as "hidden" would switch off validation for the whole form,
  // so the ancestor walk deliberately stops before it.
  it('is false when only the root itself is hidden', () => {
    const { root, input } = build(1);
    applyAction(root, 'hide');
    expect(isHiddenByCondition(input, root)).toBe(false);
  });

  // An element that carries the class itself still counts even when it sits
  // outside the root, so the pre-existing behaviour is unchanged.
  it('is true for a self-hidden element outside the root', () => {
    const { root } = build(1);
    const outside = document.createElement('input');
    outside.name = 'stray';
    document.body.appendChild(outside);
    applyAction(outside, 'hide');
    expect(isHiddenByCondition(outside, root)).toBe(true);
  });

  // A hidden element that is not an ancestor must not leak across the tree.
  it('ignores a hidden sibling subtree', () => {
    const { root, input } = build(1);
    const sibling = document.createElement('div');
    root.appendChild(sibling);
    applyAction(sibling, 'hide');
    expect(isHiddenByCondition(input, root)).toBe(false);
  });
});
