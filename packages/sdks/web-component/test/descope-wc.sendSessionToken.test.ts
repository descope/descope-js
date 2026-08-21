/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  getSessionTokenMock,
  WAIT_TIMEOUT,
  generateSdkResponse,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';

import '../src/lib/descope-wc';

// arg position of the options parameter in core-js-sdk flow.start
const START_OPTIONS_ARG_IDX = 1;

describe('web-component', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  describe('send-session-token', () => {
    it('sends the session jwt in the flow start input when enabled', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      getSessionTokenMock.mockReturnValue('the-session-jwt');

      document.body.innerHTML = `<descope-wc flow-id="sign-in" project-id="1" send-session-token="true"></descope-wc>`;

      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
      expect(startMock.mock.calls[0][START_OPTIONS_ARG_IDX]).toEqual(
        expect.objectContaining({ sessionJwt: 'the-session-jwt' }),
      );
    });

    it('does not send the session jwt by default', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      getSessionTokenMock.mockReturnValue('the-session-jwt');

      document.body.innerHTML = `<descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
      expect(
        startMock.mock.calls[0][START_OPTIONS_ARG_IDX]?.sessionJwt,
      ).toBeUndefined();
    });

    it('does not add the key when no session token exists', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      getSessionTokenMock.mockReturnValue('');

      document.body.innerHTML = `<descope-wc flow-id="sign-in" project-id="1" send-session-token="true"></descope-wc>`;

      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
      expect(
        startMock.mock.calls[0][START_OPTIONS_ARG_IDX]?.sessionJwt,
      ).toBeUndefined();
    });
  });
});
