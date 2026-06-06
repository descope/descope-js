/* eslint-disable max-classes-per-file, no-param-reassign */
import '@testing-library/jest-dom';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { componentConditionsMixin } from '../componentConditionsMixin';
import { REALTIME_CONDITION_DEBOUNCE_MS } from '../../helpers/realtime-conditions/config';
import type { RealtimeComponentsCondition, ScreenState } from '../../types';

interface HostWithMixin extends HTMLElement {
  applyComponentsState: (
    root: ParentNode,
    componentsState: Record<string, string> | undefined,
  ) => void;
  initRealtimeConditions: (
    rootElement: HTMLElement,
    screenState: ScreenState | undefined,
  ) => void;
  logger: { error: jest.Mock };
  nextRequestStatus: {
    subscribe: (cb: (v: { isLoading: boolean }) => void) => string;
    unsubscribe?: (token: string) => void;
    emit: (v: { isLoading: boolean }) => void;
    subscriberCount: () => number;
  };
}

// A no-frills mixin that gives the host a fake nextRequestStatus shaped like
// the real State<T> the mixin subscribes to. Handlers live on the instance,
// keyed by a monotonic token string so subscribe/unsubscribe match the real
// State<T> contract (subscribe returns token; unsubscribe takes token).
const nextRequestStatusStubMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class extends superclass {
      rtTestHandlers = new Map<string, (v: { isLoading: boolean }) => void>();

      rtTestNextToken = 0;

      rtTestStatus = {
        subscribe: (cb: (v: { isLoading: boolean }) => void) => {
          this.rtTestNextToken += 1;
          const token = String(this.rtTestNextToken);
          this.rtTestHandlers.set(token, cb);
          return token;
        },
        unsubscribe: (token: string) => {
          this.rtTestHandlers.delete(token);
        },
        emit: (v: { isLoading: boolean }) => {
          Array.from(this.rtTestHandlers.values()).forEach((h) => h(v));
        },
        // Test-only — number of currently-subscribed handlers. Lets a test
        // assert teardown actually unsubscribed instead of accumulating.
        subscriberCount: () => this.rtTestHandlers.size,
      };

      get nextRequestStatus() {
        return this.rtTestStatus;
      }
    },
);

let TestHost: CustomElementConstructor;

beforeAll(() => {
  const Base = compose(
    nextRequestStatusStubMixin,
    componentConditionsMixin,
  )(HTMLElement);
  TestHost = class extends Base {} as unknown as CustomElementConstructor;
  customElements.define('test-realtime-host', TestHost);
});

function mountHost(): { host: HostWithMixin; root: HTMLElement } {
  const host = document.createElement('test-realtime-host') as HostWithMixin;
  document.body.appendChild(host);
  const root = document.createElement('div');
  host.appendChild(root);
  return { host, root };
}

function mkComponent(root: HTMLElement, id: string): HTMLElement {
  const el = document.createElement('div');
  el.id = id;
  root.appendChild(el);
  return el;
}

function mkInput(
  root: HTMLElement,
  name: string,
  initial = '',
): HTMLInputElement {
  const el = document.createElement('input');
  el.setAttribute('name', name);
  el.value = initial;
  root.appendChild(el);
  return el;
}

function dispatchInput(el: HTMLElement, value: string) {
  (el as HTMLInputElement).value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function flushDebounce() {
  jest.advanceTimersByTime(REALTIME_CONDITION_DEBOUNCE_MS + 1);
}

describe('componentConditionsMixin', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  describe('applyComponentsState (baseline)', () => {
    it('applies hide / disable / read-only to matching ids on a DocumentFragment', () => {
      const { host } = mountHost();
      const fragment = document.createDocumentFragment();
      const a = mkComponent(fragment as unknown as HTMLElement, '_a');
      const b = mkComponent(fragment as unknown as HTMLElement, '_b');
      const c = mkComponent(fragment as unknown as HTMLElement, '_c');

      host.applyComponentsState(fragment, {
        _a: 'hide',
        _b: 'disable',
        _c: 'read-only',
      });

      expect(a).toHaveClass('hidden');
      expect(b).toHaveAttribute('disabled', 'true');
      expect(c).toHaveAttribute('readonly', 'true');
    });

    it('logs an error for unknown actions', () => {
      const { host, root } = mountHost();
      mkComponent(root, '_x');
      const errorSpy = jest.spyOn(host.logger, 'error');

      host.applyComponentsState(root, { _x: 'self-destruct' });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown component action "self-destruct"'),
        expect.stringContaining('"hide", "disable", "read-only"'),
      );
      errorSpy.mockRestore();
    });

    it('no-ops when componentsState is undefined or empty', () => {
      const { host, root } = mountHost();
      const x = mkComponent(root, '_x');

      expect(() => host.applyComponentsState(root, undefined)).not.toThrow();
      expect(() => host.applyComponentsState(root, {})).not.toThrow();
      expect(x).not.toHaveClass('hidden');
      expect(x).not.toHaveAttribute('disabled');
    });

    it('silently no-ops when an id in componentsState is absent from the root', () => {
      const { host, root } = mountHost();
      mkComponent(root, '_present');
      const errorSpy = jest.spyOn(host.logger, 'error');

      expect(() =>
        host.applyComponentsState(root, { _missing: 'hide' }),
      ).not.toThrow();
      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  it('no-ops when no realtimeComponentsConditions present (old backend)', () => {
    const { host, root } = mountHost();
    const chk = mkComponent(root, '_chk');
    chk.classList.add('hidden'); // simulate baseline-applied state

    const screenState: ScreenState = { form: { phone: '' } };
    host.initRealtimeConditions(root, screenState);

    // No listener should be attached → user input should leave state alone.
    const phone = mkInput(root, 'phone');
    dispatchInput(phone, '+1');
    flushDebounce();

    expect(chk).toHaveClass('hidden');
  });

  it('records baseline applied state from componentsState so initRealtimeConditions can later clear it', () => {
    const { host, root } = mountHost();
    const chk = mkComponent(root, '_chk');
    mkInput(root, 'phone');

    // Mount-path order: applyComponentsState paints baseline, then
    // initRealtimeConditions sets up the runtime layer and seeds `applied`.
    host.applyComponentsState(root, { _chk: 'hide' });
    expect(chk).toHaveClass('hidden');

    const condition: RealtimeComponentsCondition = {
      componentIds: ['_chk'],
      action: 'hide',
      rules: [
        {
          atomicConditions: [
            { operator: 'empty', target: { kind: 'form', form: 'form.phone' } },
          ],
        },
      ],
    };
    const screenState: ScreenState = {
      form: { phone: '' },
      componentsState: { _chk: 'hide' },
      realtimeComponentsConditions: [condition],
    };

    host.initRealtimeConditions(root, screenState);
    expect(chk).toHaveClass('hidden'); // unchanged — runtime trusts baseline.
  });

  it('reconciles baseline against DOM defaults on init (server-baseline was wrong)', () => {
    // The flow editor renders a default by setting `checked="true"` on the
    // component itself — the server never sees that and so its baseline
    // evaluation of `is-false(form.trustThisDevice)` fires incorrectly. On
    // init the mixin must read the DOM value and clear the bogus hide.
    const { host, root } = mountHost();
    const btn = mkComponent(root, '_btn');
    host.applyComponentsState(root, { _btn: 'hide' }); // baseline says hide
    expect(btn).toHaveClass('hidden');

    // Render a checkbox that's checked by default. Plain <input type="checkbox">
    // mirrors `.checked` the same way descope-checkbox does.
    const cb = document.createElement('input');
    cb.setAttribute('type', 'checkbox');
    cb.setAttribute('name', 'form.trustThisDevice');
    cb.checked = true;
    root.appendChild(cb);

    host.initRealtimeConditions(root, {
      // screenState.form lacks trustThisDevice (server didn't seed it)
      form: {},
      componentsState: { _btn: 'hide' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_btn'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'is-false',
                  target: { kind: 'form', form: 'form.trustThisDevice' },
                },
              ],
            },
          ],
        },
      ],
    });

    // Reconcile: DOM says checked=true, is-false fires false, hide cleared.
    expect(btn).not.toHaveClass('hidden');
  });

  it('reads the .checked property on <descope-checkbox> for boolean defaults', () => {
    // descope-checkbox parses its `checked="true"` HTML attribute into the
    // `.checked` property via its connectedCallback. DescopeWc schedules
    // initRealtimeConditions inside the same post-replaceChildren setTimeout
    // as updateScreenFromScreenState, so by the time the mixin reads form
    // values the property is already hydrated — both for baked-in attribute
    // defaults (this case) and for cross-screen carried values that
    // updateScreenFromScreenState assigns directly to `.value` / `.checked`.
    // Reading the property here is authoritative.
    const { host, root } = mountHost();
    const btn = mkComponent(root, '_btn');
    host.applyComponentsState(root, { _btn: 'hide' });

    // Fake the descope-checkbox shape after connectedCallback has run: the
    // `checked="true"` attribute is parsed and `.checked` reflects it. Tests
    // depend on this hydration being visible to the realtime read, so the
    // explicit `.checked = true` mirrors the real post-init state.
    const cb = document.createElement('descope-checkbox');
    cb.setAttribute('name', 'form.trustThisDevice');
    cb.setAttribute('checked', 'true');
    (cb as unknown as { checked: boolean }).checked = true;
    root.appendChild(cb);

    host.initRealtimeConditions(root, {
      form: {},
      componentsState: { _btn: 'hide' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_btn'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'is-false',
                  target: { kind: 'form', form: 'form.trustThisDevice' },
                },
              ],
            },
          ],
        },
      ],
    });

    // .checked=true → is-false fires false → baseline hide cleared.
    expect(btn).not.toHaveClass('hidden');
  });

  it('reads the .value property on <descope-text-field> for cross-screen carried values', () => {
    // Regression: a `form.text` value carried over from a prior screen lives
    // only on the input's `.value` property — it isn't baked into the static
    // screen template as a `value` HTML attribute. DescopeWc populates it via
    // updateScreenFromScreenState after replaceChildren; initRealtimeConditions
    // is scheduled to run right after, in the same setTimeout, so reading
    // `.value` here sees the carried value. Without that ordering, a
    // `form.text empty → hide` condition fires incorrectly on first paint
    // and stays applied until the user types.
    const { host, root } = mountHost();
    const endBtn = mkComponent(root, '_end');

    // Fake the descope-text-field shape after updateScreenFromScreenState has
    // run: tag name, name attribute, no HTML `value` attribute (BE doesn't
    // bake dynamic values into the static template), `.value` property
    // populated with the carried value.
    const tf = document.createElement('descope-text-field');
    tf.setAttribute('name', 'form.text');
    (tf as unknown as { value: string }).value = 'carried-from-prev-screen';
    root.appendChild(tf);

    host.initRealtimeConditions(root, {
      // screenState.form lacks form.text — simulate the worst case where
      // the realtime layer is the only thing that could surface the carried
      // value (it must do so via the DOM property read).
      form: {},
      realtimeComponentsConditions: [
        {
          componentIds: ['_end'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'empty',
                  target: { kind: 'form', form: 'form.text' },
                },
              ],
            },
          ],
        },
      ],
    });

    // .value="carried-from-prev-screen" → empty fires false → hide not applied.
    expect(endBtn).not.toHaveClass('hidden');
  });

  it('reconcile keeps baseline when DOM agrees with the server', () => {
    const { host, root } = mountHost();
    const btn = mkComponent(root, '_btn');
    host.applyComponentsState(root, { _btn: 'hide' });
    expect(btn).toHaveClass('hidden');

    // Checkbox unchecked → is-false fires true → baseline hide is correct.
    const cb = document.createElement('input');
    cb.setAttribute('type', 'checkbox');
    cb.setAttribute('name', 'form.trustThisDevice');
    cb.checked = false;
    root.appendChild(cb);

    host.initRealtimeConditions(root, {
      form: {},
      componentsState: { _btn: 'hide' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_btn'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'is-false',
                  target: { kind: 'form', form: 'form.trustThisDevice' },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(btn).toHaveClass('hidden');
  });

  it('unhides on input when condition stops firing', () => {
    const { host, root } = mountHost();
    const chk = mkComponent(root, '_chk');
    chk.classList.add('hidden'); // mirror baseline
    const phone = mkInput(root, 'phone', '');

    const condition: RealtimeComponentsCondition = {
      componentIds: ['_chk'],
      action: 'hide',
      rules: [
        {
          atomicConditions: [
            { operator: 'empty', target: { kind: 'form', form: 'form.phone' } },
          ],
        },
      ],
    };
    host.initRealtimeConditions(root, {
      form: { phone: '' },
      componentsState: { _chk: 'hide' },
      realtimeComponentsConditions: [condition],
    });

    dispatchInput(phone, '+1');
    flushDebounce();

    expect(chk).not.toHaveClass('hidden');
  });

  it('re-hides when the value goes back to matching the rule', () => {
    const { host, root } = mountHost();
    const chk = mkComponent(root, '_chk');
    chk.classList.add('hidden'); // baseline
    const phone = mkInput(root, 'phone', '');

    host.initRealtimeConditions(root, {
      form: { phone: '' },
      componentsState: { _chk: 'hide' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_chk'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'empty',
                  target: { kind: 'form', form: 'form.phone' },
                },
              ],
            },
          ],
        },
      ],
    });
    expect(chk).toHaveClass('hidden');

    dispatchInput(phone, '+1');
    flushDebounce();
    expect(chk).not.toHaveClass('hidden');

    dispatchInput(phone, '');
    flushDebounce();
    expect(chk).toHaveClass('hidden');
  });

  it('boolean field with is-true uses string-converted value', () => {
    const { host, root } = mountHost();
    const banner = mkComponent(root, '_banner');
    banner.classList.add('hidden'); // baseline: agree=false fires "is-false"=true → hide
    const agree = mkInput(root, 'agree', 'false');

    host.initRealtimeConditions(root, {
      form: { agree: 'false' },
      componentsState: { _banner: 'hide' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_banner'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'is-false',
                  target: { kind: 'form', form: 'form.agree' },
                },
              ],
            },
          ],
        },
      ],
    });
    expect(banner).toHaveClass('hidden');

    dispatchInput(agree, 'true');
    flushDebounce();
    expect(banner).not.toHaveClass('hidden');
  });

  it('pauses input handling while a submit is in flight', () => {
    const { host, root } = mountHost();
    const chk = mkComponent(root, '_chk');
    chk.classList.add('hidden');
    const phone = mkInput(root, 'phone', '');

    host.initRealtimeConditions(root, {
      form: { phone: '' },
      componentsState: { _chk: 'hide' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_chk'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'empty',
                  target: { kind: 'form', form: 'form.phone' },
                },
              ],
            },
          ],
        },
      ],
    });

    // Submit starts.
    host.nextRequestStatus.emit({ isLoading: true });

    dispatchInput(phone, '+1');
    flushDebounce();

    // Component must remain hidden — mixin was paused.
    expect(chk).toHaveClass('hidden');

    // Submit completes; mixin resumes.
    host.nextRequestStatus.emit({ isLoading: false });
    dispatchInput(phone, '+12');
    flushDebounce();

    expect(chk).not.toHaveClass('hidden');
  });

  it('resets state on re-init (new screen)', () => {
    const { host, root } = mountHost();
    const chk = mkComponent(root, '_chk');
    chk.classList.add('hidden'); // baseline
    const phone = mkInput(root, 'phone', '');

    host.initRealtimeConditions(root, {
      form: { phone: '' },
      componentsState: { _chk: 'hide' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_chk'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'empty',
                  target: { kind: 'form', form: 'form.phone' },
                },
              ],
            },
          ],
        },
      ],
    });

    // Re-init with a different condition group (different component).
    const chk2 = mkComponent(root, '_other');
    const newRoot = root; // same root for simplicity
    // Pre-hide _other to simulate baseline.
    chk2.classList.add('hidden');

    host.initRealtimeConditions(newRoot, {
      form: { phone: 'unused' },
      componentsState: { _other: 'hide' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_other'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'empty',
                  target: { kind: 'form', form: 'form.other' },
                },
              ],
            },
          ],
        },
      ],
    });

    // Typing into phone should NO longer trigger any change for either
    // component, because the new condition doesn't reference form.phone.
    dispatchInput(phone, '+1');
    flushDebounce();

    expect(chk).not.toHaveClass('hidden'); // initial baseline was cleared by the teardown
    expect(chk2).toHaveClass('hidden');
  });

  it('reset on re-init clears previous owned state on the old DOM', () => {
    const { host, root } = mountHost();
    const chk = mkComponent(root, '_chk');
    chk.classList.add('hidden'); // baseline
    mkInput(root, 'phone', '');

    host.initRealtimeConditions(root, {
      form: { phone: '' },
      componentsState: { _chk: 'hide' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_chk'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'empty',
                  target: { kind: 'form', form: 'form.phone' },
                },
              ],
            },
          ],
        },
      ],
    });
    expect(chk).toHaveClass('hidden');

    // Re-init with no conditions → cleans up previous applied state.
    host.initRealtimeConditions(root, { form: {} });
    expect(chk).not.toHaveClass('hidden');
  });

  // Some descope custom inputs (notably descope-checkbox) emit `change` on
  // commit rather than `input` on every keystroke. The mixin listens to both
  // so those components still drive real-time re-evaluation.
  it('re-evaluates on change events (in addition to input events)', () => {
    const { host, root } = mountHost();
    const chk = mkComponent(root, '_chk');
    chk.classList.add('hidden'); // baseline
    const phone = mkInput(root, 'phone', '');

    host.initRealtimeConditions(root, {
      form: { phone: '' },
      componentsState: { _chk: 'hide' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_chk'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'empty',
                  target: { kind: 'form', form: 'form.phone' },
                },
              ],
            },
          ],
        },
      ],
    });
    expect(chk).toHaveClass('hidden');

    // Dispatch ONLY a `change` event (no preceding `input`). The mixin must
    // still see the new value and re-evaluate.
    phone.value = '+1';
    phone.dispatchEvent(new Event('change', { bubbles: true }));
    flushDebounce();

    expect(chk).not.toHaveClass('hidden');
  });

  // The baseline `componentsState` from the server represents state the server
  // already applied to the DOM. The mixin must seed its internal `applied` map
  // from it, otherwise typing-then-clearing-then-typing won't clear the
  // server-applied class on the round-trip.
  it('seeds initial applied state from componentsState so server-applied actions get cleared on input', () => {
    const { host, root } = mountHost();
    const chk = mkComponent(root, '_chk');
    // The server already hid this component as baseline.
    chk.classList.add('hidden');
    const phone = mkInput(root, 'phone', '');

    host.initRealtimeConditions(root, {
      form: { phone: '' },
      componentsState: { _chk: 'hide' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_chk'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'empty',
                  target: { kind: 'form', form: 'form.phone' },
                },
              ],
            },
          ],
        },
      ],
    });

    // Typing should now unhide — proving the mixin treated the baseline as
    // owned and went through the clear path rather than a no-op.
    dispatchInput(phone, '+1');
    flushDebounce();

    expect(chk).not.toHaveClass('hidden');
  });

  // componentsState may include ids the conditions don't target (e.g. a server
  // CC locked them). The mixin must NOT seed those into its applied map,
  // otherwise it could accidentally clear something it doesn't own.
  it('does not seed applied state for components the conditions do not target', () => {
    const { host, root } = mountHost();
    const ownedByMixin = mkComponent(root, '_chk');
    const lockedByServer = mkComponent(root, '_locked');
    ownedByMixin.classList.add('hidden');
    lockedByServer.classList.add('hidden');
    const phone = mkInput(root, 'phone', '');

    host.initRealtimeConditions(root, {
      form: { phone: '' },
      componentsState: { _chk: 'hide', _locked: 'hide' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_chk'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'empty',
                  target: { kind: 'form', form: 'form.phone' },
                },
              ],
            },
          ],
        },
      ],
    });

    dispatchInput(phone, '+1');
    flushDebounce();

    // Mixin owns _chk → cleared.
    expect(ownedByMixin).not.toHaveClass('hidden');
    // Server owns _locked → mixin must not touch it.
    expect(lockedByServer).toHaveClass('hidden');
  });

  // When the server applies one action via componentsState and a sibling
  // realtime CC fires with a DIFFERENT action on the same component, only
  // the realtime CC's action wins on the DOM. No stacking — one action per
  // component, last-wins, matching the BE evaluator.
  it('realtime CC replaces a different-action server baseline (no stacking)', () => {
    const { host, root } = mountHost();
    const btn = mkComponent(root, '_btn');
    // Server applied `disable` baseline (e.g. from a server-only CC).
    host.applyComponentsState(root, { _btn: 'disable' });
    expect(btn).toHaveAttribute('disabled', 'true');

    // Boolean input that drives the realtime rule, default checked.
    const cb = document.createElement('input');
    cb.setAttribute('type', 'checkbox');
    cb.setAttribute('name', 'form.toggle');
    cb.checked = true;
    root.appendChild(cb);

    host.initRealtimeConditions(root, {
      form: {},
      // componentsState carries `disable` from another CC; the realtime CC
      // below applies `hide` (different action) when its rule fires.
      componentsState: { _btn: 'disable' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_btn'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'is-true',
                  target: { kind: 'form', form: 'form.toggle' },
                },
              ],
            },
          ],
        },
      ],
    });

    // Realtime fires (is-true(true)) → hide replaces disable. Server's
    // baseline action is cleared from the DOM; only the realtime action
    // remains.
    expect(btn).toHaveClass('hidden');
    expect(btn).not.toHaveAttribute('disabled');
  });

  // Sequel: when the realtime rule stops firing, the realtime layer yields
  // control back to the server baseline — so the server's original action is
  // RESTORED on the DOM. Still one action per component, but which action it
  // is depends on whether the realtime layer is currently firing.
  it('restores the server baseline when the realtime rule stops firing', () => {
    const { host, root } = mountHost();
    const btn = mkComponent(root, '_btn');
    host.applyComponentsState(root, { _btn: 'disable' });

    const cb = document.createElement('input');
    cb.setAttribute('type', 'checkbox');
    cb.setAttribute('name', 'form.toggle');
    cb.checked = true;
    root.appendChild(cb);

    host.initRealtimeConditions(root, {
      form: {},
      componentsState: { _btn: 'disable' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_btn'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'is-true',
                  target: { kind: 'form', form: 'form.toggle' },
                },
              ],
            },
          ],
        },
      ],
    });

    // While realtime fires, its `hide` replaces the server's `disable`.
    expect(btn).toHaveClass('hidden');
    expect(btn).not.toHaveAttribute('disabled');

    // Flip the controlling input — rule stops firing.
    cb.checked = false;
    cb.dispatchEvent(new Event('input', { bubbles: true }));
    flushDebounce();

    // Realtime layer yields — server's baseline `disable` comes back.
    expect(btn).not.toHaveClass('hidden');
    expect(btn).toHaveAttribute('disabled', 'true');
  });

  // When the BE ships `serverOnlyComponentsState` explicitly, the SDK uses
  // it directly and ignores the "same-action exclusion" heuristic — the BE
  // knows precisely what server-only CCs contributed, no inference needed.
  it('uses screenState.serverOnlyComponentsState directly when shipped by the BE', () => {
    const { host, root } = mountHost();
    const btn = mkComponent(root, '_btn');
    host.applyComponentsState(root, { _btn: 'hide' });

    const cb = document.createElement('input');
    cb.setAttribute('type', 'checkbox');
    cb.setAttribute('name', 'form.toggle');
    cb.checked = true;
    root.appendChild(cb);

    // Wire-level shape: componentsState carries the final last-wins verdict
    // (`hide` from a realtime CC); serverOnlyComponentsState carries the
    // EARLIER server-only CC's verdict (`disable`). Under the legacy
    // heuristic the SDK would have excluded `_btn` from its inferred
    // baseline (because the matching realtime CC's action equals
    // componentsState[_btn]) — which would strand the server-only `disable`
    // when the realtime CC stops firing. The shipped field tells the SDK
    // exactly what to restore.
    host.initRealtimeConditions(root, {
      form: {},
      componentsState: { _btn: 'hide' },
      serverOnlyComponentsState: { _btn: 'disable' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_btn'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'is-true',
                  target: { kind: 'form', form: 'form.toggle' },
                },
              ],
            },
          ],
        },
      ],
    });

    // Realtime fires (toggle is true) → `hide` is already what the DOM
    // shows from applyComponentsState, no change needed.
    expect(btn).toHaveClass('hidden');
    expect(btn).not.toHaveAttribute('disabled');

    // Toggle off → realtime stops. Server baseline (shipped explicitly)
    // says `disable` — that's what should appear on the DOM.
    cb.checked = false;
    cb.dispatchEvent(new Event('input', { bubbles: true }));
    flushDebounce();

    expect(btn).not.toHaveClass('hidden');
    expect(btn).toHaveAttribute('disabled', 'true');
  });

  // Old-BE / new-SDK compatibility: when `serverOnlyComponentsState` is
  // absent, the SDK falls back to the legacy heuristic (infer baseline from
  // componentsState, excluding matching realtime actions). Behavior must
  // match the prior session's pinned tests on the cross-layer scenarios.
  it('falls back to legacy heuristic when screenState.serverOnlyComponentsState is absent', () => {
    const { host, root } = mountHost();
    const btn = mkComponent(root, '_btn');
    host.applyComponentsState(root, { _btn: 'disable' });

    const cb = document.createElement('input');
    cb.setAttribute('type', 'checkbox');
    cb.setAttribute('name', 'form.toggle');
    cb.checked = true;
    root.appendChild(cb);

    // No `serverOnlyComponentsState` on the wire — old BE. Realtime CC's
    // action differs from componentsState, so the legacy heuristic
    // includes `_btn: 'disable'` in the inferred baseline.
    host.initRealtimeConditions(root, {
      form: {},
      componentsState: { _btn: 'disable' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_btn'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'is-true',
                  target: { kind: 'form', form: 'form.toggle' },
                },
              ],
            },
          ],
        },
      ],
    });

    // Realtime fires → replaces disable with hide.
    expect(btn).toHaveClass('hidden');
    expect(btn).not.toHaveAttribute('disabled');

    // Realtime stops → fallback restores baseline `disable`.
    cb.checked = false;
    cb.dispatchEvent(new Event('input', { bubbles: true }));
    flushDebounce();

    expect(btn).not.toHaveClass('hidden');
    expect(btn).toHaveAttribute('disabled', 'true');
  });

  // The wire-shipped serverOnlyComponentsState can contain entries for
  // components the realtime layer doesn't touch (e.g. a server-only CC that
  // hides a footer link unrelated to any realtime rule). The runtime must
  // only carry entries for `touchedIds` — otherwise the realtime layer
  // could accidentally clear or interact with components it doesn't own.
  it('filters shipped serverOnlyComponentsState to touched components only', () => {
    const { host, root } = mountHost();
    const btn = mkComponent(root, '_btn');
    const unrelated = mkComponent(root, '_unrelated');
    host.applyComponentsState(root, { _btn: 'disable', _unrelated: 'hide' });
    expect(unrelated).toHaveClass('hidden');

    const cb = document.createElement('input');
    cb.setAttribute('type', 'checkbox');
    cb.setAttribute('name', 'form.toggle');
    cb.checked = true;
    root.appendChild(cb);

    // serverOnlyComponentsState lists both `_btn` (touched by the realtime
    // CC below) AND `_unrelated` (NOT touched — managed purely by a
    // server-only CC). The realtime layer should ignore the `_unrelated`
    // entry: the component stays painted from applyComponentsState and the
    // runtime never sees it in any of its bookkeeping.
    host.initRealtimeConditions(root, {
      form: {},
      componentsState: { _btn: 'disable', _unrelated: 'hide' },
      serverOnlyComponentsState: { _btn: 'disable', _unrelated: 'hide' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_btn'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'is-true',
                  target: { kind: 'form', form: 'form.toggle' },
                },
              ],
            },
          ],
        },
      ],
    });

    // Realtime fires → `_btn` becomes hidden. `_unrelated` stays exactly as
    // applyComponentsState left it — no realtime interaction.
    expect(btn).toHaveClass('hidden');
    expect(unrelated).toHaveClass('hidden');

    // Flip the toggle. The realtime CC stops firing → `_btn` falls back to
    // its server-only `disable`. `_unrelated` is still untouched throughout.
    cb.checked = false;
    cb.dispatchEvent(new Event('input', { bubbles: true }));
    flushDebounce();

    expect(btn).not.toHaveClass('hidden');
    expect(btn).toHaveAttribute('disabled', 'true');
    // The realtime layer must never have removed the class painted by
    // applyComponentsState on a component it doesn't touch.
    expect(unrelated).toHaveClass('hidden');
  });

  it('ignores inputs that have the exclude-field attribute', () => {
    const { host, root } = mountHost();
    const chk = mkComponent(root, '_chk');
    chk.classList.add('hidden');
    const phone = mkInput(root, 'phone', '');
    phone.setAttribute('data-exclude-field', 'true');

    host.initRealtimeConditions(root, {
      form: { phone: '' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_chk'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'empty',
                  target: { kind: 'form', form: 'form.phone' },
                },
              ],
            },
          ],
        },
      ],
    });

    dispatchInput(phone, '+1');
    flushDebounce();

    expect(chk).toHaveClass('hidden');
  });

  // While a debounce timer is pending, a pause notification (submit in flight)
  // must cancel it — otherwise the deferred eval would fire mid-submit and
  // race with the next-screen render.
  it('cancels a pending debounce when nextRequestStatus emits isLoading=true', () => {
    const { host, root } = mountHost();
    const chk = mkComponent(root, '_chk');
    chk.classList.add('hidden');
    const phone = mkInput(root, 'phone', '');

    host.initRealtimeConditions(root, {
      form: { phone: '' },
      componentsState: { _chk: 'hide' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_chk'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'empty',
                  target: { kind: 'form', form: 'form.phone' },
                },
              ],
            },
          ],
        },
      ],
    });

    // Start a debounce by typing — DO NOT flush yet.
    dispatchInput(phone, '+1');

    // Submit kicks in BEFORE the debounce window closes.
    host.nextRequestStatus.emit({ isLoading: true });

    // Now flush — the pending timer must have been cancelled, so no eval.
    flushDebounce();

    // chk remains hidden (no apply ran).
    expect(chk).toHaveClass('hidden');
  });

  // Teardown happens via re-init mid-screen. If a debounce timer was pending
  // when the new screen mounts, the old timer must be cleared so it doesn't
  // fire against the new (now-stale) runtime.
  it('clears a pending debounce timer on teardown', () => {
    const { host, root } = mountHost();
    const chk = mkComponent(root, '_chk');
    chk.classList.add('hidden');
    const phone = mkInput(root, 'phone', '');

    host.initRealtimeConditions(root, {
      form: { phone: '' },
      componentsState: { _chk: 'hide' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_chk'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'empty',
                  target: { kind: 'form', form: 'form.phone' },
                },
              ],
            },
          ],
        },
      ],
    });

    // Pending debounce.
    dispatchInput(phone, '+1');

    // Re-init with no conditions — should clean up the old timer too.
    host.initRealtimeConditions(root, { form: {} });

    // Flush all timers — the old debounce must NOT fire against the new
    // (empty) runtime. If it did, the applier would clear the hide.
    // (Re-init's own teardown already cleared the baseline-applied hide,
    // so the chk is now visible. The test is: this doesn't throw and
    // no subsequent timer touches state.)
    flushDebounce();
    expect(chk).not.toHaveClass('hidden'); // cleared by re-init's teardown, not by a leaked timer
  });

  // Re-init must unsubscribe the previous nextRequestStatus handler — the
  // `subscribe`/`unsubscribe` API is token-based, so storing the handler and
  // passing it to `unsubscribe` would no-op and pile up subscribers across
  // screen transitions (keeping old runtimes/DOM roots alive).
  it('unsubscribes the pause handler across re-inits (no token leak)', () => {
    const { host, root } = mountHost();
    mkComponent(root, '_chk');
    mkInput(root, 'phone', '');

    const condition: RealtimeComponentsCondition = {
      componentIds: ['_chk'],
      action: 'hide',
      rules: [
        {
          atomicConditions: [
            { operator: 'empty', target: { kind: 'form', form: 'form.phone' } },
          ],
        },
      ],
    };

    // Three init cycles — each subscribes once; each teardown must unsubscribe.
    for (let i = 0; i < 3; i += 1) {
      host.initRealtimeConditions(root, {
        form: { phone: '' },
        realtimeComponentsConditions: [condition],
      });
    }
    expect(host.nextRequestStatus.subscriberCount()).toBe(1);

    // Teardown via re-init with no conditions — should also drop to zero.
    host.initRealtimeConditions(root, { form: {} });
    expect(host.nextRequestStatus.subscriberCount()).toBe(0);
  });

  // Rapid keystrokes inside the debounce window should coalesce into one
  // eval. The handler must clear the previous timer before setting a new one;
  // without that, every keystroke would either accumulate timers or fire
  // separate evals.
  it('coalesces a burst of input events into a single re-eval', () => {
    const { host, root } = mountHost();
    const chk = mkComponent(root, '_chk');
    chk.classList.add('hidden');
    const phone = mkInput(root, 'phone', '');

    host.initRealtimeConditions(root, {
      form: { phone: '' },
      componentsState: { _chk: 'hide' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_chk'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'empty',
                  target: { kind: 'form', form: 'form.phone' },
                },
              ],
            },
          ],
        },
      ],
    });

    // 5 events fired synchronously — every call after the first must hit the
    // clearTimeout(runtime.debounceTimer) branch.
    ['a', 'ab', 'abc', 'abcd', 'abcde'].forEach((v) => {
      dispatchInput(phone, v);
    });
    // Exactly one pending timer — proves the handler cleared the previous
    // timer on each new event rather than accumulating them.
    expect(jest.getTimerCount()).toBe(1);

    flushDebounce();
    // Final value is non-empty → rule doesn't fire → hide cleared.
    expect(chk).not.toHaveClass('hidden');
  });
});
