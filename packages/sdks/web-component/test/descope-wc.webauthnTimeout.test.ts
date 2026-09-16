/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  sdk,
  fixtures,
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

// The passkey reply is the second flow.next call, and its payload is the 6th
// argument. Read it through here so the positions live in one place.
const PASSKEY_REPLY_CALL = 1;
const NEXT_PAYLOAD_ARG = 5;
const passkeyReplyPayload = () =>
  nextMock.mock.calls[PASSKEY_REPLY_CALL]?.[NEXT_PAYLOAD_ARG];

// Enough past the budget that the timer has certainly fired.
const PAST_WEBAUTHN_TIMEOUT = WEBAUTHN_TIMEOUT + 1000;
// Comfortably inside it, so a ceremony settling here is not cut off.
const WITHIN_WEBAUTHN_TIMEOUT = WEBAUTHN_TIMEOUT - 5000;

describe('webauthn ceremony timeout', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  it('reports a timeout for the create (sign-up) ceremony too', async () => {
    await renderPasskeyScreen();
    respondWithCeremony('webauthnCreate');
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));
    sdk.webauthn.helpers.create.mockReturnValue(new Promise(() => {}));

    await startCeremony();
    await jest.advanceTimersByTimeAsync(PAST_WEBAUTHN_TIMEOUT);

    await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(2), {
      timeout: WAIT_TIMEOUT,
    });
    expect(passkeyReplyPayload()).toEqual(
      expect.objectContaining({
        transactionId: 'tx-1',
        failure: 'AbortError',
        failureReason: 'aborted',
      }),
    );
  });

  it('reports a timeout once the budget expires and clears the spinner', async () => {
    await renderPasskeyScreen();
    respondWithCeremony();
    nextMock.mockReturnValueOnce(generateSdkResponse({ screenId: '1' }));
    sdk.webauthn.helpers.get.mockReturnValue(new Promise(() => {}));

    await startCeremony();
    await jest.advanceTimersByTimeAsync(PAST_WEBAUTHN_TIMEOUT);

    await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(2), {
      timeout: WAIT_TIMEOUT,
    });
    expect(passkeyReplyPayload()).toEqual(
      expect.objectContaining({
        transactionId: 'tx-1',
        failure: 'AbortError',
        failureReason: 'aborted',
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
    await jest.advanceTimersByTimeAsync(PAST_WEBAUTHN_TIMEOUT);

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
    await jest.advanceTimersByTimeAsync(WITHIN_WEBAUTHN_TIMEOUT);
    settle('the-assertion');

    await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(2), {
      timeout: WAIT_TIMEOUT,
    });
    expect(passkeyReplyPayload()).toEqual(
      expect.objectContaining({
        transactionId: 'tx-1',
        response: 'the-assertion',
      }),
    );
    expect(passkeyReplyPayload().failure).toBeUndefined();
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
    await jest.advanceTimersByTimeAsync(PAST_WEBAUTHN_TIMEOUT);
    await waitFor(() => expect(nextMock).toHaveBeenCalledTimes(2), {
      timeout: WAIT_TIMEOUT,
    });

    // the browser answers late - it must not produce another next call
    settle('the-late-assertion');
    await jest.advanceTimersByTimeAsync(5000);

    expect(nextMock).toHaveBeenCalledTimes(2);
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
    expect(passkeyReplyPayload()).toEqual(
      expect.objectContaining({
        failure: 'NotAllowedError',
        failureReason: 'not_allowed',
      }),
    );
  });
});
