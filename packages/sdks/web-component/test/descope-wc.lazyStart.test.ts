/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  WAIT_TIMEOUT,
  generateSdkResponse,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';

import '../src/lib/descope-wc';

describe('web-component', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  describe('lazy-start', () => {
    it('does not start the flow until start() is called', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      document.body.innerHTML = `<descope-wc flow-id="sign-in" project-id="1" lazy-start="true"></descope-wc>`;
      const wc = document.getElementsByTagName('descope-wc')[0] as any;

      // the flow reaches the held start call and waits there
      await waitFor(() => expect(wc.sdk).toBeDefined(), {
        timeout: WAIT_TIMEOUT,
      });
      expect(startMock).not.toHaveBeenCalled();

      wc.start();

      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
    });

    it('starts the flow when start() is called before the flow reaches the held call', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      document.body.innerHTML = `<descope-wc flow-id="sign-in" project-id="1" lazy-start="true"></descope-wc>`;
      const wc = document.getElementsByTagName('descope-wc')[0] as any;
      wc.start();

      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
    });

    // the hold wraps sdk.flow.start itself, so every call site is covered -
    // including the start call the first-screen path makes on interaction
    it('holds any flow start call until start() is called', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      document.body.innerHTML = `<descope-wc flow-id="sign-in" project-id="1" lazy-start="true"></descope-wc>`;
      const wc = document.getElementsByTagName('descope-wc')[0] as any;

      await waitFor(() => expect(wc.sdk).toBeDefined(), {
        timeout: WAIT_TIMEOUT,
      });

      const pending = wc.sdk.flow.start('sign-in');
      await Promise.resolve();
      expect(startMock).not.toHaveBeenCalled();

      wc.start();
      await pending;
      expect(startMock).toHaveBeenCalled();
    });

    it('does not hold a later start call once released', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      document.body.innerHTML = `<descope-wc flow-id="sign-in" project-id="1" lazy-start="true"></descope-wc>`;
      const wc = document.getElementsByTagName('descope-wc')[0] as any;

      await waitFor(() => expect(wc.sdk).toBeDefined(), {
        timeout: WAIT_TIMEOUT,
      });
      wc.start();
      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      // a flow restart must not wait for another start() call
      startMock.mockClear();
      await wc.sdk.flow.start('sign-in');
      expect(startMock).toHaveBeenCalled();
    });

    it('starts the flow immediately without lazy-start', async () => {
      startMock.mockReturnValue(generateSdkResponse());

      document.body.innerHTML = `<descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
    });
  });
});
