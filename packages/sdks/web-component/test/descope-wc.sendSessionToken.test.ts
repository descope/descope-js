/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  getSessionTokenMock,
  WAIT_TIMEOUT,
  generateSdkResponse,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';

import '../src/lib/descope-wc';

// arg positions of the options parameter in core-js-sdk flow.start / flow.next
const START_OPTIONS_ARG_IDX = 1;
const NEXT_OPTIONS_ARG_IDX = 7;

describe('web-component', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  describe('send-session-token', () => {
    it('sends the session jwt in the flow start options when enabled', async () => {
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

    it('sends the session jwt in the flow next options when enabled', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      nextMock.mockReturnValueOnce(generateSdkResponse());
      getSessionTokenMock.mockReturnValue('the-session-jwt');

      document.body.innerHTML = `<descope-wc flow-id="sign-in" project-id="1" send-session-token="true"></descope-wc>`;

      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
      // call the wrapped next directly - the wrapper injects the options arg
      const wc = document.getElementsByTagName('descope-wc')[0] as any;
      await wc.sdk.flow.next('exec-id', 'step-id', 'interaction-id');
      expect(nextMock.mock.calls[0][NEXT_OPTIONS_ARG_IDX]).toEqual(
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

    it('sends the native bridge session jwt even without the attribute', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      nextMock.mockReturnValueOnce(generateSdkResponse());
      getSessionTokenMock.mockReturnValue('');

      document.body.innerHTML = `<descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
      const wc = document.getElementsByTagName('descope-wc')[0] as any;
      wc.nativeOptions = {
        platform: 'android',
        bridgeVersion: 4,
        sessionJwt: 'native-session-jwt',
      };
      await wc.sdk.flow.next('exec-id', 'step-id', 'interaction-id');
      expect(nextMock.mock.calls[0][NEXT_OPTIONS_ARG_IDX]).toEqual(
        expect.objectContaining({ sessionJwt: 'native-session-jwt' }),
      );
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
