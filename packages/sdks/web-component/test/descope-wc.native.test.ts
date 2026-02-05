/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  nextMock,
  fixtures,
  WAIT_TIMEOUT,
  generateSdkResponse,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { fireEvent, waitFor } from '@testing-library/dom';
import { screen } from 'shadow-dom-testing-library';

import '../src/lib/descope-wc';

import { CUSTOM_INTERACTIONS, RESPONSE_ACTIONS } from '../src/lib/constants';

describe('web-component', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  describe('native', () => {
    it('Should prepare a callback for a native bridge response and broadcast an event when receiving a nativeBridge action', async () => {
      startMock.mockReturnValueOnce(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.nativeBridge,
          nativeResponseType: 'oauthNative',
          nativeResponsePayload: { start: {} },
        }),
      );

      nextMock.mockReturnValueOnce(
        generateSdkResponse({
          status: 'completed',
        }),
      );

      fixtures.pageContent =
        '<div data-type="polling">...</div><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const onSuccess = jest.fn();
      const onBridge = jest.fn();

      const wcEle = document.getElementsByTagName('descope-wc')[0];

      expect(wcEle.nativeCallbacks.complete).not.toBeDefined();

      wcEle.addEventListener('success', onSuccess);
      wcEle.addEventListener('bridge', onBridge);

      await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(
        () => expect(wcEle.nativeCallbacks.complete).toBeDefined(),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      await waitFor(
        () =>
          expect(onBridge).toHaveBeenCalledWith(
            expect.objectContaining({
              detail: {
                type: 'oauthNative',
                payload: { start: {} },
              },
            }),
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      await wcEle.nativeResume(
        'oauthNative',
        JSON.stringify({ response: true }),
      );
      await waitFor(
        () =>
          expect(nextMock).toHaveBeenCalledWith(
            '0',
            '0',
            CUSTOM_INTERACTIONS.submit,
            1,
            '1.2.3',
            { response: true },
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      await waitFor(
        () =>
          expect(onSuccess).toHaveBeenCalledWith(
            expect.objectContaining({ detail: { refreshJwt: 'refreshJwt' } }),
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      wcEle.removeEventListener('success', onSuccess);
      wcEle.removeEventListener('bridge', onBridge);
    });

    it('Should handle a nativeResume oauthWeb response', async () => {
      startMock.mockReturnValueOnce(
        generateSdkResponse({
          action: RESPONSE_ACTIONS.nativeBridge,
          nativeResponseType: 'oauthWeb',
          nativeResponsePayload: { url: 'https://oauthprovider.com' },
        }),
      );

      nextMock.mockReturnValueOnce(
        generateSdkResponse({
          status: 'completed',
        }),
      );

      fixtures.pageContent =
        '<div data-type="polling">...</div><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const onSuccess = jest.fn();
      const onBridge = jest.fn();

      const wcEle = document.getElementsByTagName('descope-wc')[0];

      expect(wcEle.nativeCallbacks.complete).not.toBeDefined();

      wcEle.addEventListener('success', onSuccess);
      wcEle.addEventListener('bridge', onBridge);

      await waitFor(() => expect(startMock).toHaveBeenCalledTimes(1), {
        timeout: WAIT_TIMEOUT,
      });

      await waitFor(
        () => expect(wcEle.nativeCallbacks.complete).toBeDefined(),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      await waitFor(
        () =>
          expect(onBridge).toHaveBeenCalledWith(
            expect.objectContaining({
              detail: {
                type: 'oauthWeb',
                payload: { url: 'https://oauthprovider.com' },
              },
            }),
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      await wcEle.nativeResume(
        'oauthWeb',
        JSON.stringify({ url: 'https://deeplink.com?code=code123' }),
      );
      await waitFor(
        () =>
          expect(nextMock).toHaveBeenCalledWith(
            '0',
            '0',
            CUSTOM_INTERACTIONS.submit,
            1,
            '1.2.3',
            { exchangeCode: 'code123', idpInitiated: true },
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      await waitFor(
        () =>
          expect(onSuccess).toHaveBeenCalledWith(
            expect.objectContaining({ detail: { refreshJwt: 'refreshJwt' } }),
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      wcEle.removeEventListener('success', onSuccess);
      wcEle.removeEventListener('bridge', onBridge);
    });

    it('Should handle a nativeResume call for magic link', async () => {
      jest.spyOn(global, 'clearTimeout');

      startMock.mockReturnValueOnce(generateSdkResponse());

      fixtures.pageContent =
        '<descope-button id="submitterId">click</descope-button><span>It works!</span>';
      document.body.innerHTML = `<h1>Custom element test</h1> <descope-wc flow-id="otpSignInEmail" project-id="1"></descope-wc>`;

      const onSuccess = jest.fn();

      const wcEle = document.getElementsByTagName('descope-wc')[0];

      wcEle.addEventListener('success', onSuccess);

      await waitFor(() => screen.findByShadowText('It works!'), {
        timeout: 20000,
      });

      nextMock
        .mockReturnValueOnce(
          generateSdkResponse({
            action: RESPONSE_ACTIONS.poll,
          }),
        )
        .mockReturnValueOnce(
          generateSdkResponse({
            status: 'completed',
          }),
        );

      fireEvent.click(screen.getByShadowText('click'));

      await waitFor(() =>
        expect(nextMock).toHaveBeenNthCalledWith(
          1,
          '0',
          '0',
          'submitterId',
          1,
          '1.2.3',
          expect.any(Object),
          false,
        ),
      );

      await wcEle.nativeResume(
        'magicLink',
        JSON.stringify({
          url: 'https://deeplink.com?descope-login-flow=native%7C%23%7C2oeoLE7E8PJaR9qRLgT1rjwgiJP_2.end&t=token123',
        }),
      );
      await waitFor(
        () =>
          expect(nextMock).toHaveBeenCalledWith(
            '0',
            '2.end',
            CUSTOM_INTERACTIONS.submit,
            1,
            '1.2.3',
            expect.objectContaining({ token: 'token123' }),
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      await waitFor(
        () =>
          expect(onSuccess).toHaveBeenCalledWith(
            expect.objectContaining({ detail: { refreshJwt: 'refreshJwt' } }),
          ),
        {
          timeout: WAIT_TIMEOUT,
        },
      );

      await waitFor(() => expect(clearTimeout).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });

      wcEle.removeEventListener('success', onSuccess);
    });
  });
});
