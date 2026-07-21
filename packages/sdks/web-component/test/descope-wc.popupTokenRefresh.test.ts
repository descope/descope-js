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

  // When the popup is abandoned we reload the current screen's client scripts
  // (the captcha lives there, in screenState) to mint a fresh token - NOT the
  // sdk scripts (forter, etc.), which must not re-run just because a popup
  // closed. The captcha is a screen-level clientScript, captured at click time
  // because the popup redirect response wipes screenState.
  it('reloads the screen captcha script (not sdk scripts) after an abandoned popup', async () => {
    const makeModule = (id: string) =>
      jest.fn(() => ({
        id,
        start: jest.fn(),
        stop: jest.fn(() => true),
        refresh: jest.fn(),
        present: jest.fn(),
      }));
    (window as any).descope = {
      grecaptcha: makeModule('grecaptcha'),
      forter: makeModule('forter'),
    };

    // grecaptcha is a screen-level client script (arrives in screen.state);
    // forter is a flow-level sdk script.
    fixtures.configContent = {
      flows: {
        'sign-in': {
          version: 1,
          sdkScripts: [
            { id: 'forter', initArgs: { siteId: 'x' }, resultKey: 'token' },
          ],
        },
      },
    };
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
    // clicking the social button opens an OAuth popup (redirect response)
    nextMock.mockReturnValue({
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

    fixtures.pageContent =
      '<descope-button id="social">Continue with Google</descope-button><span>ready</span>';

    document.body.innerHTML = `<descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;
    const wc: any = document.querySelector('descope-wc');

    await waitFor(() => screen.getByShadowText('ready'), {
      timeout: WAIT_TIMEOUT,
    });

    // click the social button -> flow.next returns a popup redirect
    fireEvent.click(screen.getByShadowText('Continue with Google'));
    await waitFor(() => expect(helpers.openCenteredPopup).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });

    // watch what gets reloaded when the popup closes
    const loadSpy = jest.spyOn(wc, 'loadSdkScripts');

    // user closes the popup without completing
    popupObj.closed = true;
    await jest.advanceTimersByTimeAsync(1100);
    await jest.runAllTimersAsync();

    await waitFor(() => expect(loadSpy).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });
    const reloadedIds = loadSpy.mock.calls
      .flatMap(([scripts]) => (scripts as { id: string }[]) || [])
      .map((s) => s.id);
    expect(reloadedIds).toContain('grecaptcha');
    expect(reloadedIds).not.toContain('forter');
  });
});
