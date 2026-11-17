/* eslint-disable import/order */
// @ts-nocheck

import {
  setupWebComponentTestEnv,
  teardownWebComponentTestEnv,
  startMock,
  createSdk,
  getRefreshTokenMock,
  WAIT_TIMEOUT,
  generateSdkResponse,
} from './descope-wc.test-harness';

import '@testing-library/jest-dom';
import { waitFor } from '@testing-library/dom';

import '../src/lib/descope-wc';

const lastSdkConfig = () => (createSdk as jest.Mock).mock.calls.at(-1)[0];

describe('web-component', () => {
  beforeEach(() => {
    setupWebComponentTestEnv();
  });

  afterEach(() => {
    teardownWebComponentTestEnv();
  });

  describe('persist-tokens', () => {
    it('persists tokens by default', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());

      document.body.innerHTML = `<descope-wc flow-id="sign-in" project-id="1"></descope-wc>`;

      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
      expect(lastSdkConfig().persistTokens).toBe(true);
    });

    it('does not persist, but still sends the stored refresh token, when false', async () => {
      startMock.mockReturnValueOnce(generateSdkResponse());
      getRefreshTokenMock.mockReturnValue('stored-refresh');

      document.body.innerHTML = `<descope-wc flow-id="sign-in" project-id="1" persist-tokens="false" storage-prefix="p_"></descope-wc>`;

      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
      const config = lastSdkConfig();
      expect(config.persistTokens).toBe(false);

      const hooks = [].concat(config.hooks.beforeRequest);
      const req = hooks.reduce((acc, hook) => hook(acc), { path: '/x' });
      expect(req.token).toBe('stored-refresh');
      expect(getRefreshTokenMock).toHaveBeenCalledWith('p_');

      // a token already on the request wins
      const withToken = hooks.reduce((acc, hook) => hook(acc), { token: 't' });
      expect(withToken.token).toBe('t');
    });

    it('does not mutate the shared sdkConfigOverrides hooks', async () => {
      const WebComponent = customElements.get('descope-wc') as any;
      const original = WebComponent.sdkConfigOverrides;
      const sharedHook = jest.fn((c) => c);
      WebComponent.sdkConfigOverrides = {
        ...original,
        hooks: { beforeRequest: sharedHook },
      };
      startMock.mockReturnValueOnce(generateSdkResponse());

      document.body.innerHTML = `<descope-wc flow-id="sign-in" project-id="1" persist-tokens="false"></descope-wc>`;

      await waitFor(() => expect(startMock).toHaveBeenCalled(), {
        timeout: WAIT_TIMEOUT,
      });
      expect(WebComponent.sdkConfigOverrides.hooks.beforeRequest).toBe(
        sharedHook,
      );
      expect([].concat(lastSdkConfig().hooks.beforeRequest)).toContain(
        sharedHook,
      );
      WebComponent.sdkConfigOverrides = original;
    });
  });
});
