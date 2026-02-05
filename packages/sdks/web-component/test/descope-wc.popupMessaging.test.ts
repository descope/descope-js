/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable import/order */
// @ts-nocheck

import {
  WAIT_TIMEOUT,
  fixtures,
  setupWebComponentTestEnv,
  startMock,
  teardownWebComponentTestEnv,
  generateSdkResponse,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

// eslint-disable-next-line import/no-namespace
import * as helpers from '../src/lib/helpers/helpers';
import { RESPONSE_ACTIONS } from '../src/lib/constants';

describe('web-component', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  describe('popup postMessage / BroadcastChannel logic', () => {
    let originalBroadcastChannel;
    let broadcastInstances;
    let originalWindowName;
    let originalOpener;

    beforeEach(() => {
      originalBroadcastChannel = global.BroadcastChannel;
      broadcastInstances = [];
      class MockBroadcastChannel {
        constructor(name) {
          this.name = name;
          this.messages = [];
          this.closed = false;
          this.onMessageInternal = null;
          broadcastInstances.push(this);
        }

        postMessage(msg) {
          this.messages.push(msg);
        }

        close() {
          this.closed = true;
        }

        set onmessage(fn) {
          this.onMessageInternal = fn;
        }

        get onmessage() {
          return this.onMessageInternal;
        }

        emit(event) {
          if (this.onMessageInternal) this.onMessageInternal(event);
        }
      }
      // @ts-ignore
      global.BroadcastChannel = jest.fn(
        (name) => new MockBroadcastChannel(name),
      );

      originalWindowName = window.name;
      originalOpener = window.opener;
      window.opener = { postMessage: jest.fn() } as any;
      window.close = jest.fn();

      startMock.mockReturnValue(generateSdkResponse({}));
    });

    afterEach(() => {
      global.BroadcastChannel = originalBroadcastChannel;
      window.name = originalWindowName;
      window.opener = originalOpener;
    });

    it('shouldUsePopupPostMessage returns false when popup-origin not set', async () => {
      fixtures.pageContent = '<div>Loaded popup test</div>';
      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;
      const wc: any = document.querySelector('descope-wc');
      await waitFor(() => screen.getByShadowText('Loaded popup test'), {
        timeout: WAIT_TIMEOUT,
      });
      expect(wc.shouldUsePopupPostMessage()).toBe(false);
    });

    it('shouldUsePopupPostMessage returns true when popup-origin value has the same window origin', async () => {
      fixtures.pageContent = '<div>Loaded popup test</div>';
      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" popup-origin="${window.location.origin}"></descope-wc>`;
      const wc: any = document.querySelector('descope-wc');
      await waitFor(() => screen.getByShadowText('Loaded popup test'), {
        timeout: WAIT_TIMEOUT,
      });
      expect(wc.shouldUsePopupPostMessage()).toBe(true);
    });

    it('shouldUsePopupPostMessage returns false for invalid origin attribute', async () => {
      fixtures.pageContent = '<div>Loaded popup test</div>';
      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" popup-origin="not-a-valid-url"></descope-wc>`;
      const wc: any = document.querySelector('descope-wc');
      await waitFor(() => screen.getByShadowText('Loaded popup test'), {
        timeout: WAIT_TIMEOUT,
      });
      expect(wc.shouldUsePopupPostMessage()).toBe(false);
    });

    it('shouldUsePopupPostMessage returns true for valid different origin', async () => {
      fixtures.pageContent = '<div>Loaded popup test</div>';
      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1" popup-origin="https://example.com"></descope-wc>`;
      const wc: any = document.querySelector('descope-wc');
      await waitFor(() => screen.getByShadowText('Loaded popup test'), {
        timeout: WAIT_TIMEOUT,
      });
      expect(wc.shouldUsePopupPostMessage()).toBe(true);
    });

    it('notifyOpener uses BroadcastChannel when window.name not set', async () => {
      fixtures.pageContent = '<div>Loaded popup test</div>';
      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;
      const wc: any = document.querySelector('descope-wc');
      await waitFor(() => screen.getByShadowText('Loaded popup test'), {
        timeout: WAIT_TIMEOUT,
      });

      // Simulate popup flow state changes
      wc.flowState.update({
        executionId: 'exec-1',
        isPopup: true,
        code: undefined,
        exchangeError: undefined,
      });
      wc.flowState.update({
        executionId: 'exec-1',
        isPopup: true,
        code: 'abc123',
        exchangeError: undefined,
      });
      await waitFor(
        () => expect(global.BroadcastChannel).toHaveBeenCalledWith('exec-1'),
        {
          timeout: 2000,
        },
      );
      const instance = broadcastInstances.find((b) => b.name === 'exec-1');
      expect(instance).toBeTruthy();
      expect(instance.messages).toContainEqual({
        action: 'code',
        data: { code: 'abc123', exchangeError: undefined },
      });
      expect(instance.closed).toBe(true);
    });

    it('notifyOpener uses postMessage fallback with window.name prefix', async () => {
      fixtures.pageContent = '<div>Loaded popup test</div>';
      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;
      const wc: any = document.querySelector('descope-wc');
      await waitFor(() => screen.getByShadowText('Loaded popup test'), {
        timeout: WAIT_TIMEOUT,
      });

      // Set window.name pattern to trigger postMessage fallback
      const crossOrigin = 'https://cross-origin.example';
      window.name = `descope-wc|${crossOrigin}`;

      wc.flowState.update({
        executionId: 'exec-2',
        isPopup: true,
        code: undefined,
        exchangeError: 'errX',
      });
      wc.flowState.update({
        executionId: 'exec-2',
        isPopup: true,
        code: 'codeXYZ',
        exchangeError: 'errX',
      });
      await waitFor(
        () => expect(window.opener.postMessage).toHaveBeenCalled(),
        {
          timeout: 2000,
        },
      );
      expect(window.opener.postMessage).toHaveBeenCalledWith(
        { action: 'code', data: { code: 'codeXYZ', exchangeError: 'errX' } },
        crossOrigin,
      );
      expect(global.BroadcastChannel).not.toHaveBeenCalledWith('exec-2');
    });

    it('notifyOpener handles postMessage errors gracefully', async () => {
      fixtures.pageContent = '<div>Loaded popup test</div>';
      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;
      const wc: any = document.querySelector('descope-wc');
      await waitFor(() => screen.getByShadowText('Loaded popup test'), {
        timeout: WAIT_TIMEOUT,
      });

      const crossOrigin = 'https://other.example';
      window.name = `descope-wc|${crossOrigin}`;
      (window.opener.postMessage as jest.Mock).mockImplementation(() => {
        throw new Error('COOP blocked');
      });

      wc.flowState.update({
        executionId: 'exec-3',
        isPopup: true,
        code: 'x',
        exchangeError: 'y',
      });
      await waitFor(
        () => expect(window.opener.postMessage).toHaveBeenCalled(),
        {
          timeout: 2000,
        },
      );
      expect(global.BroadcastChannel).not.toHaveBeenCalledWith('exec-3');
    });

    // Removed deprecated commented redirect tests; active versions added later with cleanup coverage

    it('should detect popup close and dispatch event', async () => {
      startMock.mockReturnValue({
        ok: true,
        data: {
          stepId: 's3',
          stepName: 'Step 3',
          action: RESPONSE_ACTIONS.redirect,
          screen: { id: '0', state: {} },
          redirect: { url: 'https://auth.example', isPopup: true },
          executionId: 'exec-redirect-close',
          status: 'running',
          authInfo: 'auth info',
          webauthn: { options: '', transactionId: '' },
          samlIdpResponse: { url: '', samlResponse: '', relayState: '' },
          lastAuth: {},
          nativeResponse: { type: '', payload: {} },
        },
        error: {},
      });
      const popupObj: any = {
        closed: false,
        name: '',
        location: { href: '' },
        focus: jest.fn(),
      };
      jest.spyOn(helpers, 'openCenteredPopup').mockReturnValue(popupObj);
      fixtures.pageContent = '';
      document.body.innerHTML = `<descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;
      const wc: any = document.querySelector('descope-wc');
      const onClosed = jest.fn();
      wc.addEventListener('popupclosed', onClosed);
      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: 2000,
      });
      // Advance time to trigger interval check
      popupObj.closed = true;
      jest.advanceTimersByTime(1100);
      await waitFor(() => expect(onClosed).toHaveBeenCalled(), {
        timeout: 2000,
      });
    });
  });
});
