/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  fixtures,
  generateSdkResponse,
  WAIT_TIMEOUT,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { fireEvent, waitFor } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

import { REALTIME_CONDITION_DEBOUNCE_MS } from '../src/lib/helpers/realtime-conditions/config';

describe('web-component real-time conditions integration', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  it('toggles a component class as the user types in a referenced input', async () => {
    // A residual that hides _chk while form.phone is empty.
    startMock.mockReturnValue(
      generateSdkResponse({
        screenState: {
          form: { phone: '' },
          componentsState: { _chk: 'hide' },
          realtimeComponentsConditions: [
            {
              id: 'cc1',
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
        },
      }),
    );

    fixtures.pageContent = `
      <input name="phone" id="phone" />
      <span id="_chk">Checkbox</span>
    `;

    document.body.innerHTML = `<descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

    // Wait for the page to render. The mounted component is the <span id="_chk">.
    const chk = await waitFor(() => screen.getByShadowText('Checkbox'), {
      timeout: WAIT_TIMEOUT,
    });
    expect(chk).toBeTruthy();

    // Baseline: server-applied componentsState says hide → class should be set.
    expect(chk).toHaveClass('hidden');

    const phone = chk
      .getRootNode()
      .querySelector('input[name="phone"]') as HTMLInputElement;
    expect(phone).toBeTruthy();

    // User types into phone → residual stops firing → _chk becomes visible.
    phone.value = '+1';
    phone.dispatchEvent(new Event('input', { bubbles: true }));
    jest.advanceTimersByTime(REALTIME_CONDITION_DEBOUNCE_MS + 5);

    expect(chk).not.toHaveClass('hidden');

    // User clears the field → residual fires again → re-hide.
    phone.value = '';
    phone.dispatchEvent(new Event('input', { bubbles: true }));
    jest.advanceTimersByTime(REALTIME_CONDITION_DEBOUNCE_MS + 5);

    expect(chk).toHaveClass('hidden');
  });

  it('applies the read-only action and clears it when the rule stops firing', async () => {
    // Use the boolean toggle as the trigger and the text input as the target.
    startMock.mockReturnValue(
      generateSdkResponse({
        screenState: {
          form: { agree: 'false' },
          // Server applied nothing — at start agree=false → is-true=false → rule doesn't fire.
          componentsState: {},
          realtimeComponentsConditions: [
            {
              id: 'cc-readonly',
              componentIds: ['_text'],
              action: 'read-only',
              rules: [
                {
                  atomicConditions: [
                    {
                      operator: 'is-true',
                      target: { kind: 'form', form: 'form.agree' },
                    },
                  ],
                },
              ],
            },
          ],
        },
      }),
    );

    fixtures.pageContent = `
      <input name="agree" id="agree" value="false" />
      <input name="text" id="_text" />
    `;
    document.body.innerHTML = `<descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

    const wc = document.querySelector('descope-wc') as HTMLElement;
    // Wait for the screen to mount.
    await waitFor(
      () => expect(wc.shadowRoot!.querySelector('[id="_text"]')).toBeTruthy(),
      { timeout: WAIT_TIMEOUT },
    );
    const target = wc.shadowRoot!.querySelector(
      '[id="_text"]',
    ) as HTMLInputElement;
    expect(target.hasAttribute('readonly')).toBe(false);

    // Flip the toggle to "true" → rule fires → read-only applied.
    const agree = wc.shadowRoot!.querySelector(
      '[name="agree"]',
    ) as HTMLInputElement;
    agree.value = 'true';
    agree.dispatchEvent(new Event('input', { bubbles: true }));
    jest.advanceTimersByTime(REALTIME_CONDITION_DEBOUNCE_MS + 5);

    expect(target.getAttribute('readonly')).toBe('true');

    // Flip back → cleared.
    agree.value = 'false';
    agree.dispatchEvent(new Event('input', { bubbles: true }));
    jest.advanceTimersByTime(REALTIME_CONDITION_DEBOUNCE_MS + 5);

    expect(target.hasAttribute('readonly')).toBe(false);
  });

  it('evaluates an atomic where the predicate side is itself a form ref', async () => {
    // form.text equal form.expected → hide _chk.
    // Both sides are live form keys; mutating either should re-fire.
    startMock.mockReturnValue(
      generateSdkResponse({
        screenState: {
          form: { text: '', expected: 'go' },
          componentsState: {}, // text="" != expected="go" → rule doesn't fire at baseline
          realtimeComponentsConditions: [
            {
              id: 'cc-pred-form',
              componentIds: ['_chk'],
              action: 'hide',
              rules: [
                {
                  atomicConditions: [
                    {
                      operator: 'equal',
                      target: { kind: 'form', form: 'form.text' },
                      predicate: { kind: 'form', form: 'form.expected' },
                    },
                  ],
                },
              ],
            },
          ],
        },
      }),
    );

    fixtures.pageContent = `
      <input name="text" id="text" value="" />
      <input name="expected" id="expected" value="go" />
      <span id="_chk">Checkbox</span>
    `;
    document.body.innerHTML = `<descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

    const chk = await waitFor(() => screen.getByShadowText('Checkbox'), {
      timeout: WAIT_TIMEOUT,
    });
    expect(chk).not.toHaveClass('hidden'); // text != expected at start

    const wc = document.querySelector('descope-wc') as HTMLElement;
    const text = wc.shadowRoot!.querySelector(
      '[name="text"]',
    ) as HTMLInputElement;
    const expected = wc.shadowRoot!.querySelector(
      '[name="expected"]',
    ) as HTMLInputElement;

    // Make text match the expected → rule fires → hide.
    text.value = 'go';
    text.dispatchEvent(new Event('input', { bubbles: true }));
    jest.advanceTimersByTime(REALTIME_CONDITION_DEBOUNCE_MS + 5);
    expect(chk).toHaveClass('hidden');

    // Change the OTHER side — the predicate-side form ref — so equality breaks.
    expected.value = 'changed';
    expected.dispatchEvent(new Event('input', { bubbles: true }));
    jest.advanceTimersByTime(REALTIME_CONDITION_DEBOUNCE_MS + 5);
    expect(chk).not.toHaveClass('hidden');
  });

  it('cleans up runtime state across screens (multi-screen lifecycle)', async () => {
    // Screen 1: form.s1 empty → hide _btn1.
    // After interaction, screen 2 mounts with form.s2 empty → hide _btn2.
    // Verify (a) screen-2 state is fresh, (b) screen-1 listeners don't leak.
    const screen1Page = `
      <input name="s1" id="s1" value="" />
      <span id="_btn1">B1</span>
      <descope-button id="next-btn">go</descope-button>
    `;
    const screen2Page = `
      <input name="s2" id="s2" value="" />
      <span id="_btn2">B2</span>
    `;

    startMock.mockReturnValue(
      generateSdkResponse({
        screenState: {
          form: { s1: '' },
          componentsState: { _btn1: 'hide' },
          realtimeComponentsConditions: [
            {
              id: 'cc-s1',
              componentIds: ['_btn1'],
              action: 'hide',
              rules: [
                {
                  atomicConditions: [
                    {
                      operator: 'empty',
                      target: { kind: 'form', form: 'form.s1' },
                    },
                  ],
                },
              ],
            },
          ],
        },
      }),
    );
    fixtures.pageContent = screen1Page;

    document.body.innerHTML = `<descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

    const btn1 = await waitFor(() => screen.getByShadowText('B1'), {
      timeout: WAIT_TIMEOUT,
    });
    expect(btn1).toHaveClass('hidden');

    // Simulate transitioning to screen 2: change the fetched HTML and mock the
    // next response so the SDK renders a new screen.
    fixtures.pageContent = screen2Page;
    nextMock.mockReturnValueOnce(
      generateSdkResponse({
        screenState: {
          form: { s2: '' },
          componentsState: { _btn2: 'hide' },
          realtimeComponentsConditions: [
            {
              id: 'cc-s2',
              componentIds: ['_btn2'],
              action: 'hide',
              rules: [
                {
                  atomicConditions: [
                    {
                      operator: 'empty',
                      target: { kind: 'form', form: 'form.s2' },
                    },
                  ],
                },
              ],
            },
          ],
        },
      }),
    );

    // Drive a transition by clicking the screen-1 next button. descope-wc
    // intercepts the click and calls flow.next() — which our mock answers
    // with the screen-2 state.
    fireEvent.click(screen.getByShadowText('go'));
    await waitFor(() => screen.getByShadowText('B2'), {
      timeout: WAIT_TIMEOUT,
    });

    const wc = document.querySelector('descope-wc') as any;

    const btn2 = screen.getByShadowText('B2');
    expect(btn2).toHaveClass('hidden');

    // The old screen-1 elements should be gone from the shadow DOM.
    expect(wc.shadowRoot.querySelector('[id="_btn1"]')).toBeNull();
    expect(wc.shadowRoot.querySelector('[name="s1"]')).toBeNull();

    // Driving form.s2 should now work via the freshly-initialized runtime.
    const s2 = wc.shadowRoot.querySelector('[name="s2"]') as HTMLInputElement;
    s2.value = 'x';
    s2.dispatchEvent(new Event('input', { bubbles: true }));
    jest.advanceTimersByTime(REALTIME_CONDITION_DEBOUNCE_MS + 5);
    expect(btn2).not.toHaveClass('hidden');
  });

  it('no-ops when the server response omits realtimeComponentsConditions (old backend)', async () => {
    startMock.mockReturnValue(
      generateSdkResponse({
        screenState: {
          form: { phone: '' },
          componentsState: { _chk: 'hide' },
          // intentionally absent: realtimeComponentsConditions
        },
      }),
    );

    fixtures.pageContent = `
      <input name="phone" id="phone" />
      <span id="_chk">Checkbox</span>
    `;

    document.body.innerHTML = `<descope-wc project-id="1" flow-id="otpSignInEmail"></descope-wc>`;

    const chk = await waitFor(() => screen.getByShadowText('Checkbox'), {
      timeout: WAIT_TIMEOUT,
    });

    // Server applied hide via componentsState.
    expect(chk).toHaveClass('hidden');

    const phone = chk
      .getRootNode()
      .querySelector('input[name="phone"]') as HTMLInputElement;
    phone.value = '+1';
    phone.dispatchEvent(new Event('input', { bubbles: true }));
    jest.advanceTimersByTime(REALTIME_CONDITION_DEBOUNCE_MS + 5);

    // Nothing real-time — class should remain.
    expect(chk).toHaveClass('hidden');
  });
});
