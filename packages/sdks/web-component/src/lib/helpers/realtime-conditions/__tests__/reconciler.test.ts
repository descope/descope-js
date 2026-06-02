import '@testing-library/jest-dom';
import { applyAction, clearAction, reconcile } from '../reconciler';

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

describe('reconcile', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('applies new state', () => {
    const a = mkEl('a');
    const b = mkEl('b');
    const next = reconcile(document.body, {}, { a: 'hide', b: 'disable' });
    expect(a).toHaveClass('hidden');
    expect(b).toHaveAttribute('disabled', 'true');
    expect(next).toEqual({ a: 'hide', b: 'disable' });
  });

  it('clears state no longer present', () => {
    const a = mkEl('a');
    applyAction(a, 'hide');
    const next = reconcile(document.body, { a: 'hide' }, {});
    expect(a).not.toHaveClass('hidden');
    expect(next).toEqual({});
  });

  it('handles action changes for the same id', () => {
    const a = mkEl('a');
    applyAction(a, 'hide');
    const next = reconcile(document.body, { a: 'hide' }, { a: 'disable' });
    expect(a).not.toHaveClass('hidden');
    expect(a).toHaveAttribute('disabled', 'true');
    expect(next).toEqual({ a: 'disable' });
  });

  it('is a no-op when applied and next agree', () => {
    const a = mkEl('a');
    applyAction(a, 'hide');
    const before = a.outerHTML;
    reconcile(document.body, { a: 'hide' }, { a: 'hide' });
    expect(a.outerHTML).toBe(before);
  });

  it('does not touch components outside the maps', () => {
    const a = mkEl('a');
    const other = mkEl('other');
    other.classList.add('hidden');
    reconcile(document.body, {}, { a: 'hide' });
    expect(a).toHaveClass('hidden');
    expect(other).toHaveClass('hidden'); // untouched
  });

  it('silently skips components missing from the DOM', () => {
    expect(() => reconcile(document.body, {}, { ghost: 'hide' })).not.toThrow();
  });
});
