import Cookies from 'js-cookie';
import { beforeRequest } from '../src/enhancers/withPersistTokens/helpers';
import {
  KNOWN_DEVICE_TOKEN_KEY,
  TRUSTED_DEVICE_TOKEN_KEY,
} from '../src/enhancers/withPersistTokens/constants';
import { HTTPMethods } from '@descope/core-js-sdk';

jest.mock('js-cookie', () => ({
  set: jest.fn(),
  get: jest.fn(),
  remove: jest.fn(),
}));

describe('beforeRequest hook - DKD header', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Populating Descope Known Device header', () => {
    it('should add x-descope-known-device-token header when DKD exists in localStorage', () => {
      localStorage.setItem(KNOWN_DEVICE_TOKEN_KEY, 'my-dkd-token');

      const config = {
        path: '/v1/flow/start',
        method: 'POST' as HTTPMethods,
        body: { flowId: 'test-flow' },
      };

      const hook = beforeRequest('', false);
      const result = hook(config);

      expect(result.headers).toEqual({
        'x-descope-known-device-token': 'my-dkd-token',
      });
    });

    it('should add x-descope-known-device-token header with storage prefix', () => {
      const prefix = 'myprefix-';
      localStorage.setItem(
        prefix + KNOWN_DEVICE_TOKEN_KEY,
        'prefixed-dkd-token',
      );

      const config = {
        path: '/v1/flow/start',
        method: 'POST' as HTTPMethods,
        body: { flowId: 'test-flow' },
      };

      const hook = beforeRequest(prefix, false);
      const result = hook(config);

      expect(result.headers).toEqual({
        'x-descope-known-device-token': 'prefixed-dkd-token',
      });
    });

    it('should not add x-descope-known-device-token header when DKD does not exist', () => {
      const config = {
        path: '/v1/flow/start',
        method: 'POST' as HTTPMethods,
        body: { flowId: 'test-flow' },
      };

      const hook = beforeRequest('', false);
      const result = hook(config);

      expect(result.headers).toBeUndefined();
    });

    it('should preserve existing headers when adding DKD header', () => {
      localStorage.setItem(KNOWN_DEVICE_TOKEN_KEY, 'my-dkd-token');

      const config = {
        path: '/v1/flow/start',
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
        'x-descope-known-device-token': 'my-dkd-token',
      });
    });
  });

  describe('DTD and DKD are sent independently', () => {
    it('should add both x-descope-trusted-device-token and x-descope-known-device-token headers when both are present', () => {
      localStorage.setItem(TRUSTED_DEVICE_TOKEN_KEY, 'my-dtd-token');
      localStorage.setItem(KNOWN_DEVICE_TOKEN_KEY, 'my-dkd-token');

      const config = {
        path: '/v1/flow/start',
        method: 'POST' as HTTPMethods,
        body: { flowId: 'test-flow' },
      };

      const hook = beforeRequest('', false);
      const result = hook(config);

      expect(result.headers).toEqual({
        'x-descope-trusted-device-token': 'my-dtd-token',
        'x-descope-known-device-token': 'my-dkd-token',
      });
    });

    it('should add x-descope-known-device-token header when only DKD is present (no DTD)', () => {
      localStorage.setItem(KNOWN_DEVICE_TOKEN_KEY, 'my-dkd-token');

      const config = {
        path: '/v1/flow/start',
        method: 'POST' as HTTPMethods,
        body: { flowId: 'test-flow' },
      };

      const hook = beforeRequest('', false);
      const result = hook(config);

      expect(result.headers).toEqual({
        'x-descope-known-device-token': 'my-dkd-token',
      });
    });

    it('should add neither header when neither DTD nor DKD is present', () => {
      const config = {
        path: '/v1/flow/start',
        method: 'POST' as HTTPMethods,
        body: { flowId: 'test-flow' },
      };

      const hook = beforeRequest('', false);
      const result = hook(config);

      expect(result.headers).toBeUndefined();
    });
  });

  describe('token handling', () => {
    beforeEach(() => {
      // Reset cookie mock to return undefined by default for localStorage tests
      (Cookies.get as jest.Mock).mockReturnValue(undefined);
    });

    it('should still add refresh token when DKD is also present (localStorage mode)', () => {
      localStorage.setItem(KNOWN_DEVICE_TOKEN_KEY, 'dkd-token');
      localStorage.setItem('DSR', 'refresh-token');

      const config = {
        path: '/v1/flow/start',
        method: 'POST' as HTTPMethods,
        body: { flowId: 'test-flow' },
      };

      const hook = beforeRequest('', false);
      const result = hook(config);

      expect(result.token).toBe('refresh-token');
      expect(result.headers).toEqual({
        'x-descope-known-device-token': 'dkd-token',
      });
    });
  });
});
