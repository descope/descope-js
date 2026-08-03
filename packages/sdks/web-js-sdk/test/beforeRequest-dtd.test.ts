import Cookies from 'js-cookie';
import { beforeRequest } from '../src/enhancers/withPersistTokens/helpers';
import { TRUSTED_DEVICE_TOKEN_KEY } from '../src/enhancers/withPersistTokens/constants';
import { HTTPMethods } from '@descope/core-js-sdk';

jest.mock('js-cookie', () => ({
  set: jest.fn(),
  get: jest.fn(),
  remove: jest.fn(),
}));

describe('beforeRequest hook - DTD header', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Populating Descope Trusted Device header', () => {
    it('should add x-descope-trusted-device-token header when DTD exists in localStorage', () => {
      localStorage.setItem(TRUSTED_DEVICE_TOKEN_KEY, 'my-dtd-token');

      const config = {
        path: '/v2/flow/start',
        method: 'POST' as HTTPMethods,
        body: { flowId: 'test-flow' },
      };

      const hook = beforeRequest('', false);
      const result = hook(config);

      expect(result.headers).toEqual({
        'x-descope-trusted-device-token': 'my-dtd-token',
      });
    });

    it('should add x-descope-trusted-device-token header with storage prefix', () => {
      const prefix = 'myprefix-';
      localStorage.setItem(
        prefix + TRUSTED_DEVICE_TOKEN_KEY,
        'prefixed-dtd-token',
      );

      const config = {
        path: '/v2/flow/start',
        method: 'POST' as HTTPMethods,
        body: { flowId: 'test-flow' },
      };

      const hook = beforeRequest(prefix, false);
      const result = hook(config);

      expect(result.headers).toEqual({
        'x-descope-trusted-device-token': 'prefixed-dtd-token',
      });
    });

    it('should not add x-descope-trusted-device-token header when DTD does not exist', () => {
      const config = {
        path: '/v2/flow/start',
        method: 'POST' as HTTPMethods,
        body: { flowId: 'test-flow' },
      };

      const hook = beforeRequest('', false);
      const result = hook(config);

      expect(result.headers).toBeUndefined();
    });

    it('should preserve existing headers when adding DTD header', () => {
      localStorage.setItem(TRUSTED_DEVICE_TOKEN_KEY, 'my-dtd-token');

      const config = {
        path: '/v2/flow/start',
        method: 'POST' as HTTPMethods,
        body: { flowId: 'test-flow' },
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value',
        },
      };

      const hook = beforeRequest('', false);
      const result = hook(config);

      expect(result.headers).toEqual({
        'Content-Type': 'application/json',
        'X-Custom-Header': 'custom-value',
        'x-descope-trusted-device-token': 'my-dtd-token',
      });
    });
  });

  describe('token handling', () => {
    beforeEach(() => {
      // Reset cookie mock to return undefined by default for localStorage tests
      (Cookies.get as jest.Mock).mockReturnValue(undefined);
    });

    it('should still add refresh token when DTD is also present (localStorage mode)', () => {
      localStorage.setItem(TRUSTED_DEVICE_TOKEN_KEY, 'dtd-token');
      localStorage.setItem('DSR', 'refresh-token');

      const config = {
        path: '/v2/flow/start',
        method: 'POST' as HTTPMethods,
        body: { flowId: 'test-flow' },
      };

      const hook = beforeRequest('', false);
      const result = hook(config);

      expect(result.token).toBe('refresh-token');
      expect(result.headers).toEqual({
        'x-descope-trusted-device-token': 'dtd-token',
      });
    });
  });
});
