import { applyComponentsState, clearComponentsState } from './applier';

function root(html: string): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

describe('componentsConditions applier', () => {
  it('hides a component by data-id (hidden attr + inline display)', () => {
    const r = root('<div data-id="passkey"></div><div data-id="email"></div>');
    applyComponentsState(r, { passkey: 'hide' });

    const passkey = r.querySelector('[data-id="passkey"]') as HTMLElement;
    const email = r.querySelector('[data-id="email"]') as HTMLElement;
    expect(passkey.hasAttribute('hidden')).toBe(true);
    expect(passkey.style.display).toBe('none');
    // untargeted component is untouched
    expect(email.hasAttribute('hidden')).toBe(false);
  });

  it('disables and sets read-only by data-id', () => {
    const r = root('<input data-id="a" /><input data-id="b" />');
    applyComponentsState(r, { a: 'disable', b: 'read-only' });

    expect(r.querySelector('[data-id="a"]')!.getAttribute('disabled')).toBe(
      'true',
    );
    expect(r.querySelector('[data-id="b"]')!.getAttribute('readonly')).toBe(
      'true',
    );
  });

  it('no-ops on empty or undefined state', () => {
    const r = root('<div data-id="x"></div>');
    applyComponentsState(r, undefined);
    applyComponentsState(r, {});
    expect(r.querySelector('[data-id="x"]')!.hasAttribute('hidden')).toBe(
      false,
    );
  });

  it('clearComponentsState reverts what apply set', () => {
    const r = root('<div data-id="x"></div>');
    applyComponentsState(r, { x: 'hide' });
    clearComponentsState(r, { x: 'hide' });

    const x = r.querySelector('[data-id="x"]') as HTMLElement;
    expect(x.hasAttribute('hidden')).toBe(false);
    expect(x.style.display).toBe('');
  });
});
