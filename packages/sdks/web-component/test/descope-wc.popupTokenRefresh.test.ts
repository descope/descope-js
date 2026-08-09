// @ts-nocheck
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable import/order */
/* eslint-disable import/first */

// Disable source-map-support for this file to avoid source map parsing errors
if (typeof Error.prepareStackTrace !== 'undefined') {
  Error.prepareStackTrace = undefined;
}

import {
  fixtures,
  setupWebComponentTestEnv,
  startMock,
  nextMock,
  teardownWebComponentTestEnv,
  generateSdkResponse,
  WAIT_TIMEOUT,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor, fireEvent } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

// eslint-disable-next-line import/no-namespace
import * as helpers from '../src/lib/helpers/helpers';
import { RESPONSE_ACTIONS } from '../src/lib/constants';

// The recaptcha risk token is regenerated when a social-login popup is *abandoned*
// (closed without completing). The web component signals that on the `popupclosed`
// event via `detail.abandoned`, so the close handler only refreshes the token when
// there really was no OAuth response. These tests lock in that signal.
describe('web-component popup token refresh', () => {
  const EXECUTION_ID = 'exec-popup-token';

  let originalBroadcastChannel: typeof global.BroadcastChannel;
  let broadcastInstances: any[];
  let popupObj: any;

  beforeEach(() => {
    setupWebComponentTestEnv();

    originalBroadcastChannel = global.BroadcastChannel;
    broadcastInstances = [];
    class MockBroadcastChannel {
      name: string;

      closed = false;

      onMessageInternal: ((event: any) => void) | null = null;

      constructor(name: string) {
        this.name = name;
        broadcastInstances.push(this);
      }

      close() {
        this.closed = true;
      }

      set onmessage(fn: ((event: any) => void) | null) {
        this.onMessageInternal = fn;
      }

      get onmessage() {
        return this.onMessageInternal;
      }

      emit(event: any) {
        this.onMessageInternal?.(event);
      }
    }
    // @ts-expect-error - Mocking BroadcastChannel for tests
    global.BroadcastChannel = jest.fn((name) => new MockBroadcastChannel(name));

    popupObj = {
      closed: false,
      name: '',
      location: { href: '' },
      focus: jest.fn(),
    };
    jest.spyOn(helpers, 'openCenteredPopup').mockReturnValue(popupObj);

    // a start response that opens an OAuth popup
    startMock.mockReturnValue({
      ok: true,
      data: {
        stepId: 's1',
        stepName: 'Step 1',
        action: RESPONSE_ACTIONS.redirect,
        screen: { id: '0', state: {} },
        redirect: { url: 'https://auth.example', isPopup: true },
        executionId: EXECUTION_ID,
        status: 'running',
        authInfo: 'auth info',
        webauthn: { options: '', transactionId: '' },
        samlIdpResponse: { url: '', samlResponse: '', relayState: '' },
        lastAuth: {},
        nativeResponse: { type: '', payload: {} },
      },
      error: {},
    });
  });

  afterEach(() => {
    global.BroadcastChannel = originalBroadcastChannel;
    teardownWebComponentTestEnv();
  });

  const mountAndOpenPopup = async () => {
    jest.useFakeTimers();
    fixtures.pageContent = '';
    document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;
    const wc: any = document.querySelector('descope-wc');
    const detail: { abandoned?: boolean } = {};
    wc.addEventListener('popupclosed', (e: CustomEvent) => {
      Object.assign(detail, { abandoned: e.detail?.abandoned });
    });
    await waitFor(() => expect(startMock).toHaveBeenCalled(), {
      timeout: 2000,
    });
    // the popup opens on a deferred flow-state update; flush timers so
    // openCenteredPopup runs and the broadcast channel is created.
    await jest.advanceTimersByTimeAsync(100);
    await waitFor(() => expect(helpers.openCenteredPopup).toHaveBeenCalled(), {
      timeout: 2000,
    });
    return { wc, detail };
  };

  it('marks the popup as abandoned when it is closed without a response', async () => {
    const { detail } = await mountAndOpenPopup();

    // user closes the popup without completing OAuth
    popupObj.closed = true;
    await jest.advanceTimersByTimeAsync(1100);
    await jest.runAllTimersAsync();

    expect(detail.abandoned).toBe(true);
    jest.useRealTimers();
  });

  it('does NOT mark the popup as abandoned when a code response arrived before it closed', async () => {
    const { detail } = await mountAndOpenPopup();

    // the popup posts back an OAuth response (success code) via the broadcast channel
    const channel = broadcastInstances.find((b) => b.name === EXECUTION_ID);
    expect(channel).toBeTruthy();
    channel.emit({
      origin: window.location.origin,
      data: { action: 'code', data: { code: 'the-code' } },
    });

    // then the popup closes
    popupObj.closed = true;
    await jest.advanceTimersByTimeAsync(1100);
    await jest.runAllTimersAsync();

    expect(detail.abandoned).toBe(false);
    jest.useRealTimers();
  });

  it('marks as abandoned when a non-code message arrived (popup was not completed)', async () => {
    const { detail } = await mountAndOpenPopup();

    // an unrelated message that is not an OAuth response must not count as completion
    const channel = broadcastInstances.find((b) => b.name === EXECUTION_ID);
    channel.emit({
      origin: window.location.origin,
      data: { action: 'something-else' },
    });

    popupObj.closed = true;
    await jest.advanceTimersByTimeAsync(1100);
    await jest.runAllTimersAsync();

    expect(detail.abandoned).toBe(true);
    jest.useRealTimers();
  });

  // End-to-end reproduction of the DUPE issue: the recaptcha token is a
  // single-use screen-level clientScript. It is minted before the popup and
  // sent with the OAuth `next`; when the popup is abandoned the fix must mint a
  // FRESH token so the following submit does not resend the spent one (which the
  // backend rejects as a duplicate).
  it('sends a fresh captcha token on the next submit after an abandoned popup', async () => {
    const TOKEN_KEY = 'sdkScriptsResults.grecaptcha_riskToken';
    const grecaptcha = jest.fn(() => ({
      id: 'grecaptcha',
      start: jest.fn(),
      stop: jest.fn(() => true),
      refresh: jest.fn(),
      present: jest.fn(),
    }));
    (window as any).descope = { grecaptcha };

    // the welcome screen carries the grecaptcha client script (screen-level)
    startMock.mockReturnValue(
      generateSdkResponse({
        screenState: {
          clientScripts: [
            {
              id: 'grecaptcha',
              initArgs: { enterprise: true },
              resultKey: 'riskToken',
            },
          ],
        },
      }),
    );
    // first submit (social) opens an OAuth popup; later submits render a screen
    nextMock.mockReturnValueOnce({
      ok: true,
      data: {
        stepId: 's2',
        stepName: 'oauth',
        action: RESPONSE_ACTIONS.redirect,
        screen: { id: '', state: null },
        redirect: { url: 'https://auth.example', isPopup: true },
        executionId: EXECUTION_ID,
        status: 'running',
        webauthn: { options: '', transactionId: '' },
        samlIdpResponse: { url: '', samlResponse: '', relayState: '' },
        lastAuth: {},
        nativeResponse: { type: '', payload: {} },
      },
      error: {},
    });
    nextMock.mockReturnValue(generateSdkResponse());

    fixtures.pageContent =
      '<descope-button id="social">Continue with Google</descope-button>' +
      '<descope-button id="submit">Submit</descope-button><span>ready</span>';

    document.body.innerHTML = `<descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

    await waitFor(() => screen.getByShadowText('ready'), {
      timeout: WAIT_TIMEOUT,
    });

    // screen render loads grecaptcha -> deliver the first token (before popup)
    await waitFor(() => expect(grecaptcha).toHaveBeenCalledTimes(1), {
      timeout: WAIT_TIMEOUT,
    });
    grecaptcha.mock.calls[0][2]('TOKEN_1');

    // click the social button -> the OAuth next carries the first token
    fireEvent.click(screen.getByShadowText('Continue with Google'));
    await waitFor(() => expect(helpers.openCenteredPopup).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });
    expect(nextMock.mock.calls[0][5][TOKEN_KEY]).toBe('TOKEN_1');

    // user closes the popup without completing -> the fix reloads grecaptcha
    popupObj.closed = true;
    await jest.advanceTimersByTimeAsync(1100);
    await jest.runAllTimersAsync();
    await waitFor(() => expect(grecaptcha).toHaveBeenCalledTimes(2), {
      timeout: WAIT_TIMEOUT,
    });
    // the reloaded module mints a fresh token
    grecaptcha.mock.calls[1][2]('TOKEN_2');

    // next submit must carry the FRESH token, not the spent one (no DUPE)
    fireEvent.click(screen.getByShadowText('Submit'));
    await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(2), {
      timeout: WAIT_TIMEOUT,
    });
    const secondSubmit = nextMock.mock.calls[1][5];
    expect(secondSubmit[TOKEN_KEY]).toBe('TOKEN_2');
    expect(secondSubmit[TOKEN_KEY]).not.toBe('TOKEN_1');
  });
});
