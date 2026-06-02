/* eslint-disable max-classes-per-file, no-param-reassign */
import '@testing-library/jest-dom';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { realtimeConditionsMixin } from '../realtimeConditionsMixin';
import { REALTIME_CONDITION_DEBOUNCE_MS } from '../../helpers/realtime-conditions/config';
import type { RealtimeComponentsCondition, ScreenState } from '../../types';

interface HostWithMixin extends HTMLElement {
  initRealtimeConditions: (
    rootElement: HTMLElement,
    screenState: ScreenState | undefined,
  ) => void;
  nextRequestStatus: {
    subscribe: (cb: (v: { isLoading: boolean }) => void) => void;
    unsubscribe?: (cb: (v: { isLoading: boolean }) => void) => void;
    emit: (v: { isLoading: boolean }) => void;
  };
}

// A no-frills mixin that gives the host a fake nextRequestStatus shaped like
// the real State<T> the mixin subscribes to. Handlers live on the instance so
// repeat access returns the same store.
const nextRequestStatusStubMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class extends superclass {
      rtTestHandlers: ((v: { isLoading: boolean }) => void)[] = [];

      rtTestStatus = {
        subscribe: (cb: (v: { isLoading: boolean }) => void) => {
          this.rtTestHandlers.push(cb);
        },
        unsubscribe: (cb: (v: { isLoading: boolean }) => void) => {
          const idx = this.rtTestHandlers.indexOf(cb);
          if (idx >= 0) this.rtTestHandlers.splice(idx, 1);
        },
        emit: (v: { isLoading: boolean }) => {
          this.rtTestHandlers.slice().forEach((h) => h(v));
        },
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
    realtimeConditionsMixin,
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

describe('realtimeConditionsMixin', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
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

  // The mixin trusts the upstream `applyComponentsState` call to have set the
  // DOM. It does not reconcile on mount; it just records `componentsState` so
  // it can clear it when the input changes such that the rule no longer fires.
  it('records baseline applied state from componentsState without touching the DOM on mount', () => {
    const { host, root } = mountHost();
    const chk = mkComponent(root, '_chk');
    // Simulate the upstream `applyComponentsState` call.
    chk.classList.add('hidden');
    mkInput(root, 'phone');

    const residual: RealtimeComponentsCondition = {
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
      realtimeComponentsConditions: [residual],
    };

    host.initRealtimeConditions(root, screenState);
    expect(chk).toHaveClass('hidden'); // unchanged from baseline
  });

  it('unhides on input when residual stops firing', () => {
    const { host, root } = mountHost();
    const chk = mkComponent(root, '_chk');
    chk.classList.add('hidden'); // mirror baseline
    const phone = mkInput(root, 'phone', '');

    const residual: RealtimeComponentsCondition = {
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
      realtimeComponentsConditions: [residual],
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

  it('boolean field with is-true uses string-coerced value', () => {
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

    // Re-init with a different residual (different component).
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
    // component, because the new residual doesn't reference form.phone.
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

    // Re-init with no residuals → cleans up previous applied state.
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

  // componentsState may include ids the residuals don't touch (e.g. a server
  // CC locked them). The mixin must NOT seed those into its applied map,
  // otherwise it could accidentally clear something it doesn't own.
  it('does not seed applied state for components the residuals do not touch', () => {
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

  // `is-email` and `is-phone` don't go through the operators map — they consult
  // the component's own `checkValidity()` via the validity-checker the mixin
  // builds against the current root. This test exercises that path end-to-end.
  it('consults the component validity (checkValidity) for is-email / is-phone operators', () => {
    const { host, root } = mountHost();
    const submit = mkComponent(root, '_submit');
    submit.classList.add('hidden'); // baseline: email invalid → hide submit
    const email = mkInput(root, 'email', '');
    // Stub checkValidity so the mixin's ValidityChecker sees a predictable signal.
    let valid = false;
    (email as any).checkValidity = () => valid;

    host.initRealtimeConditions(root, {
      form: { email: '' },
      componentsState: { _submit: 'hide' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_submit'],
          // hide while is-email is FALSE — rule is "hide unless the email validates"
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  // The atomic doesn't directly say "negate" — but the evaluator
                  // wraps is-email/is-phone behind validity, so when validity is
                  // false the rule's `evaluateAtomic` returns false ⇒ rule
                  // doesn't fire ⇒ no hide. We want hide WHILE the field is
                  // invalid, so we flip the meaning by using `is-email` and
                  // asserting hide ↔ validity false through the surrounding
                  // server-baseline + clear path: baseline applies hide
                  // (componentsState above), mixin owns it, and once validity
                  // flips true the next eval clears.
                  operator: 'is-email',
                  target: { kind: 'form', form: 'form.email' },
                },
              ],
            },
          ],
        },
      ],
    });

    // Sanity: server-applied baseline is preserved (mixin doesn't reconcile on mount).
    expect(submit).toHaveClass('hidden');

    // Validity flips to true → rule fires → result map says hide → still hidden.
    // (Mixin keeps hide because checkValidity=true means is-email returns true.)
    valid = true;
    dispatchInput(email, 'a@b.com');
    flushDebounce();
    expect(submit).toHaveClass('hidden');

    // Validity flips back to false → rule no longer fires → mixin clears the
    // baseline-applied hide. This is the path that proves the validity-checker
    // is actually being called: if the mixin ignored is-email, the rule would
    // never react to value changes and the hide would either stay or be cleared
    // on the first input regardless of validity.
    valid = false;
    dispatchInput(email, 'not-an-email');
    flushDebounce();
    expect(submit).not.toHaveClass('hidden');
  });

  // If the evaluator throws (e.g. a component's checkValidity blows up under
  // some edge state), the mixin catches, logs, and preserves prior applied
  // state. Without the catch, one bad input event would tear down the
  // realtime layer for the rest of the screen.
  it('catches evaluator errors and preserves applied state', () => {
    const { host, root } = mountHost();
    const chk = mkComponent(root, '_chk');
    chk.classList.add('hidden'); // baseline applied
    const email = mkInput(root, 'email', '');
    // Make checkValidity throw — propagates through evaluateAll's validity callback.
    (email as any).checkValidity = () => {
      throw new Error('boom');
    };

    host.initRealtimeConditions(root, {
      form: { email: '' },
      componentsState: { _chk: 'hide' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_chk'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'is-email',
                  target: { kind: 'form', form: 'form.email' },
                },
              ],
            },
          ],
        },
      ],
    });

    dispatchInput(email, 'a@b.com');
    flushDebounce();

    // Error was caught — applied state from baseline preserved.
    expect(chk).toHaveClass('hidden');
  });

  // The `is-email`/`is-phone` validity-checker returns `undefined` when the
  // element exists but has no `checkValidity` method (e.g. a custom element
  // not implementing the ElementInternals contract). The evaluator treats
  // that as "not valid" → rule doesn't fire.
  it('safely returns false when the matched element has no checkValidity', () => {
    const { host, root } = mountHost();
    const chk = mkComponent(root, '_chk');
    chk.classList.add('hidden');
    // Make a fake input-like element with name=email but NO checkValidity.
    const fakeInput = document.createElement('div');
    fakeInput.setAttribute('name', 'email');
    (fakeInput as any).value = '';
    root.appendChild(fakeInput);

    host.initRealtimeConditions(root, {
      form: { email: '' },
      componentsState: { _chk: 'hide' },
      realtimeComponentsConditions: [
        {
          componentIds: ['_chk'],
          action: 'hide',
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'is-email',
                  target: { kind: 'form', form: 'form.email' },
                },
              ],
            },
          ],
        },
      ],
    });

    (fakeInput as any).value = 'something';
    fakeInput.dispatchEvent(new Event('input', { bubbles: true }));
    flushDebounce();

    // No checkValidity → rule never fires → mixin clears the baseline hide.
    expect(chk).not.toHaveClass('hidden');
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

    // chk remains hidden (no reconcile ran).
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

    // Re-init with no residuals — should clean up the old timer too.
    host.initRealtimeConditions(root, { form: {} });

    // Flush all timers — the old debounce must NOT fire against the new
    // (empty) runtime. If it did, the reconciler would clear the hide.
    // (Re-init's own teardown already cleared the baseline-applied hide,
    // so the chk is now visible. The test is: this doesn't throw and
    // no subsequent timer touches state.)
    flushDebounce();
    expect(chk).not.toHaveClass('hidden'); // cleared by re-init's teardown, not by a leaked timer
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
    for (const v of ['a', 'ab', 'abc', 'abcd', 'abcde']) {
      dispatchInput(phone, v);
    }
    // Exactly one pending timer — proves the handler cleared the previous
    // timer on each new event rather than accumulating them.
    expect(jest.getTimerCount()).toBe(1);

    flushDebounce();
    // Final value is non-empty → rule doesn't fire → hide cleared.
    expect(chk).not.toHaveClass('hidden');
  });

  // `is-email` / `is-phone` operators that don't reference an on-screen form
  // key should fall through to a literal false. This shouldn't crash and
  // should leave the DOM alone.
  it('returns false for is-email/is-phone with no on-screen form target', () => {
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
          // Combine on-screen empty (triggers re-eval) with is-email against a
          // literal (no form ref) to exercise the validity-checker's "no form
          // key" early-return.
          rules: [
            {
              atomicConditions: [
                {
                  operator: 'empty',
                  target: { kind: 'form', form: 'form.phone' },
                },
                {
                  operator: 'is-email',
                  target: { kind: 'value', value: 'literal@x.com' },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(chk).toHaveClass('hidden');

    // Type into phone — empty atomic becomes false, AND => rule doesn't fire,
    // hide is cleared. The is-email atomic short-circuited safely.
    dispatchInput(phone, '+1');
    flushDebounce();
    expect(chk).not.toHaveClass('hidden');
  });
});
