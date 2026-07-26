/* eslint-disable import/order */
// @ts-nocheck

/**
 * Verifies the polling loop STOPS when a poll returns 403 E108201
 * (flow-nonce validation failure / replay protection).
 *
 * Production symptom before the fix: a flow polling screen kept calling
 * POST /v1/flow/next with interactionId 'polling' every ~2s for hours,
 * resubmitting a stale/consumed nonce, receiving 403 E108201 every time, never
 * stopping (the 403 carries no rotated nonce, so it cannot self-heal). The loop
 * only halted for error codes on stopOnErrors, and E108201 was absent from it.
 *
 * Fix: NONCE_VALIDATION_ERROR_CODE ('E108201') is on stopOnErrors, so the loop
 * terminates on the first nonce error, same as E103205/E103202.
 */

import {
  WAIT_TIMEOUT,
  fixtures,
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  generateSdkResponse,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';

import '../src/lib/descope-wc';

import {
  CUSTOM_INTERACTIONS,
  FLOW_TIMED_OUT_ERROR_CODE,
  NONCE_VALIDATION_ERROR_CODE,
  RESPONSE_ACTIONS,
} from '../src/lib/constants';

const OBSERVATION_MS = 8000; // pollingDefaultDelay is 2000ms => several polls fit

describe('polling stops on a flow-nonce error', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  const runPollingScenario = async (errorCode: string): Promise<number> => {
    jest.useRealTimers();

    // start -> a screen; first next -> a poll-action screen (loader mounts),
    // then every subsequent poll returns a poll-action screen whose underlying
    // request failed with the given errorCode. action stays 'poll' so the wc
    // does not clear the polling timeout on its own - exactly like the server
    // keeping the loader screen up while /v1/flow/next 403s underneath.
    startMock.mockReturnValueOnce(generateSdkResponse());

    nextMock
      .mockReturnValueOnce(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.poll,
        }),
      )
      .mockReturnValue(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.poll,
          ok: false,
          requestErrorCode: errorCode,
        }),
      );

    fixtures.pageContent =
      '<div data-type="polling">...</div><span>It works!</span>';
    document.body.innerHTML = `<h1>repro</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

    // wait until the loop is clearly running (at least one polling call landed)
    await waitFor(() => expect(nextMock.mock.calls.length).toBeGreaterThan(1), {
      timeout: WAIT_TIMEOUT,
    });

    // Count polling calls over a fixed observation window.
    nextMock.mockClear();
    await new Promise((resolve) => {
      setTimeout(resolve, OBSERVATION_MS);
    });

    return nextMock.mock.calls.filter(
      (args) => args[2] === CUSTOM_INTERACTIONS.polling,
    ).length;
  };

  it('stops polling on E108201 (flow-nonce validation failure)', async () => {
    const pollingCalls = await runPollingScenario(NONCE_VALIDATION_ERROR_CODE);
    // Loop halts: at most the single in-flight poll already scheduled.
    expect(pollingCalls).toBeLessThanOrEqual(1);
  }, 30000);

  it('stops polling on E103205 (control: already on stopOnErrors)', async () => {
    const pollingCalls = await runPollingScenario(FLOW_TIMED_OUT_ERROR_CODE);
    expect(pollingCalls).toBeLessThanOrEqual(1);
  }, 30000);
});
