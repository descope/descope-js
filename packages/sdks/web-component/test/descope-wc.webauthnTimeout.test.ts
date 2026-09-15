/* eslint-disable import/order */
// jest-dom's toBeEnabled/toBeDisabled only understand real form controls. These
// are custom elements carrying a disabled attribute, so those matchers would
// pass no matter what - assert on the attribute instead.
/* eslint-disable jest-dom/prefer-enabled-disabled */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  sdk,
  fixtures,
  fetchMock,
  generateSdkResponse,
  WAIT_TIMEOUT,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor, fireEvent } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

import { WEBAUTHN_TIMEOUT } from '../src/lib/constants';

const PASSKEY_SCREEN = `
  <span>Test Page</span>
  <descope-button id="passkey">Sign in with passkey</descope-button>
  <descope-button id="fallback">Use password instead</descope-button>
  <input id="email" name="email" placeholder="Email"/>
`;

const renderPasskeyScreen = async () => {
  startMock.mockReturnValue(generateSdkResponse());
  fixtures.pageContent = PASSKEY_SCREEN;
  document.body.innerHTML = `<descope-wc flow-id="test-flow" project-id="1"></descope-wc>`;

  await waitFor(() => screen.getByShadowText('Test Page'), {
    timeout: WAIT_TIMEOUT,
  });
};

/** Answer the passkey click with a webauthn action, so a ceremony starts. */
const respondWithCeremony = (action = 'webauthnGet') =>
  nextMock.mockReturnValueOnce(
    generateSdkResponse({
      action,
      webAuthnTransactionId: 'tx-1',
      webAuthnOptions: '{}',
    }),
  );

const startCeremony = async () => {
  fireEvent.click(screen.getByShadowText('Sign in with passkey'));
  await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(1), {
    timeout: WAIT_TIMEOUT,
  });
};

const passkeyButton = () => screen.getByShadowText('Sign in with passkey');
const fallbackButton = () => screen.getByShadowText('Use password instead');

describe('webauthn ceremony timeout', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  it('hands the rest of the screen back while the ceremony runs, but not the passkey button', async () => {
    await renderPasskeyScreen();
    respondWithCeremony();
    sdk.webauthn.helpers.get.mockReturnValue(new Promise(() => {}));

    await startCeremony();

    // the other actions become usable again so the user can escape
    await waitFor(
      () => expect(fallbackButton()).not.toHaveAttribute('disabled', 'true'),
      { timeout: WAIT_TIMEOUT },
    );
    expect(screen.getByShadowPlaceholderText('Email')).not.toHaveAttribute(
      'disabled',
      'true',
    );

    // but the passkey button keeps spinning, which is what blocks a second one
    expect(passkeyButton()).toHaveAttribute('loading', 'true');
  });

  it('does the same for the create (sign-up) ceremony', async () => {
    await renderPasskeyScreen();
    respondWithCeremony('webauthnCreate');
    sdk.webauthn.helpers.create.mockReturnValue(new Promise(() => {}));

    await startCeremony();

    await waitFor(
      () => expect(fallbackButton()).not.toHaveAttribute('disabled', 'true'),
      { timeout: WAIT_TIMEOUT },
    );
    expect(passkeyButton()).toHaveAttribute('loading', 'true');
  });

  it('reports a timeout once the budget expires and clears the spinner', async () => {
    await renderPasskeyScreen();
    respondWithCeremony();
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));
    sdk.webauthn.helpers.get.mockReturnValue(new Promise(() => {}));

    await startCeremony();
    await jest.advanceTimersByTimeAsync(WEBAUTHN_TIMEOUT + 1000);

    await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(2), {
      timeout: WAIT_TIMEOUT,
    });
    expect(nextMock.mock.calls[1][5]).toEqual(
      expect.objectContaining({
        transactionId: 'tx-1',
        failure: 'TimeoutError',
        failureReason: 'timeout',
      }),
    );

    await waitFor(
      () => expect(passkeyButton()).not.toHaveAttribute('loading'),
      {
        timeout: WAIT_TIMEOUT,
      },
    );
  });

  it('aborts the pending call when it times out', async () => {
    await renderPasskeyScreen();
    respondWithCeremony();
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));
    sdk.webauthn.helpers.get.mockReturnValue(new Promise(() => {}));

    await startCeremony();
    await jest.advanceTimersByTimeAsync(WEBAUTHN_TIMEOUT + 1000);

    const abortController = sdk.webauthn.helpers.get.mock.calls[0][1];
    expect(abortController).toBeInstanceOf(AbortController);
    expect(abortController.signal.aborted).toBe(true);
  });

  it('lets a slow but genuine ceremony finish inside the budget', async () => {
    await renderPasskeyScreen();
    respondWithCeremony();
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    let settle: (v: string) => void;
    sdk.webauthn.helpers.get.mockReturnValue(
      new Promise((res) => {
        settle = res;
      }),
    );

    await startCeremony();
    await jest.advanceTimersByTimeAsync(WEBAUTHN_TIMEOUT - 5000);
    settle('the-assertion');

    await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(2), {
      timeout: WAIT_TIMEOUT,
    });
    expect(nextMock.mock.calls[1][5]).toEqual(
      expect.objectContaining({
        transactionId: 'tx-1',
        response: 'the-assertion',
      }),
    );
    expect(nextMock.mock.calls[1][5].failure).toBeUndefined();
  });

  it('drops a result that arrives after the budget expired', async () => {
    await renderPasskeyScreen();
    respondWithCeremony();
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    let settle: (v: string) => void;
    sdk.webauthn.helpers.get.mockReturnValue(
      new Promise((res) => {
        settle = res;
      }),
    );

    await startCeremony();
    await jest.advanceTimersByTimeAsync(WEBAUTHN_TIMEOUT + 1000);
    await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(2), {
      timeout: WAIT_TIMEOUT,
    });

    // the browser answers late - it must not produce another next call
    settle('the-late-assertion');
    await jest.advanceTimersByTimeAsync(5000);

    expect(nextMock).toHaveBeenCalledTimes(2);
  });

  it('drops the result when the user gave up and took another action', async () => {
    await renderPasskeyScreen();
    respondWithCeremony();
    // the escape: clicking the fallback advances the flow to a new screen
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '2' }));

    let settle: (v: string) => void;
    sdk.webauthn.helpers.get.mockReturnValue(
      new Promise((res) => {
        settle = res;
      }),
    );

    await startCeremony();
    // the ceremony has to be genuinely underway before we escape it
    await waitFor(() => expect(sdk.webauthn.helpers.get).toHaveBeenCalled(), {
      timeout: WAIT_TIMEOUT,
    });

    // the user escapes while the ceremony is still pending
    fireEvent.click(fallbackButton());
    await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(2), {
      timeout: WAIT_TIMEOUT,
    });

    // only now does the browser answer, for a step the flow has already left
    settle('the-abandoned-assertion');
    await jest.advanceTimersByTimeAsync(2000);

    // it must not be reported - the flow has moved on
    expect(nextMock).toHaveBeenCalledTimes(2);
    expect(
      nextMock.mock.calls.some(
        (call) => call[5]?.response === 'the-abandoned-assertion',
      ),
    ).toBe(false);
  });

  it('drops the response when the user escapes while the reply is in flight', async () => {
    await renderPasskeyScreen();
    respondWithCeremony();

    // the passkey reply is slow, leaving a window where the user can switch
    let respondToCeremonyReply: (v: unknown) => void;
    nextMock.mockReturnValueOnce(
      new Promise((res) => {
        respondToCeremonyReply = res;
      }),
    );
    // the escape lands while that reply is still in flight
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '2' }));

    sdk.webauthn.helpers.get.mockResolvedValue('the-assertion');

    await startCeremony();
    await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(2), {
      timeout: WAIT_TIMEOUT,
    });

    // user gives up on the passkey and picks another method
    fireEvent.click(fallbackButton());
    await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(3), {
      timeout: WAIT_TIMEOUT,
    });

    // only now does the passkey reply come back - it must not clobber the
    // screen the user moved to, so its screen is never even fetched
    respondToCeremonyReply(generateSdkResponse({ screenId: '99' }));
    await jest.advanceTimersByTimeAsync(2000);

    const fetchedScreens = fetchMock.mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.endsWith('.html'));
    expect(fetchedScreens.some((url) => url.includes('99'))).toBe(false);
  });

  it('still reports a real NotAllowedError unchanged', async () => {
    await renderPasskeyScreen();
    respondWithCeremony();
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));

    const err = new Error('The operation either timed out or was not allowed.');
    err.name = 'NotAllowedError';
    (err as any).reason = 'not_allowed';
    sdk.webauthn.helpers.get.mockRejectedValue(err);

    await startCeremony();

    await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(2), {
      timeout: WAIT_TIMEOUT,
    });
    expect(nextMock.mock.calls[1][5]).toEqual(
      expect.objectContaining({
        failure: 'NotAllowedError',
        failureReason: 'not_allowed',
      }),
    );
  });
});
