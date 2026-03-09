import Cookies from 'js-cookie';
import { beforeRequest } from '../src/enhancers/withPersistTokens/helpers';
import {
  REFRESH_COOKIE_NAME_KEY,
  TRUSTED_DEVICE_TOKEN_KEY,
} from '../src/enhancers/withPersistTokens/constants';
import { HTTPMethods } from '@descope/core-js-sdk';

jest.mock('js-cookie', () => ({
  set: jest.fn(),
  get: jest.fn(),
  remove: jest.fn(),
}));

// Use a factory to avoid mutation of shared config objects.
// beforeRequest uses Object.assign which mutates the input config, so each test
// must pass its own fresh object to avoid cross-test contamination.
const makeConfig = (extra?: object) => ({
  path: '/v1/flow/start',
  method: 'POST' as HTTPMethods,
  body: { flowId: 'test-flow' },
  ...extra,
});

describe('beforeRequest hook - refresh cookie name header', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    (Cookies.get as jest.Mock).mockReturnValue(undefined);
  });

  describe('when DSRCN is in localStorage and no SDK config', () => {
    it('should add x-descope-refresh-cookie-name header', () => {
      localStorage.setItem(REFRESH_COOKIE_NAME_KEY, 'MY_SERVER_COOKIE');

      const hook = beforeRequest('', undefined, undefined);
      const result = hook(makeConfig());

      expect(result.headers).toEqual(
        expect.objectContaining({
          'x-descope-refresh-cookie-name': 'MY_SERVER_COOKIE',
        }),
      );
    });

    it('should respect storagePrefix when reading DSRCN', () => {
      localStorage.setItem(
        `myapp.${REFRESH_COOKIE_NAME_KEY}`,
        'PREFIXED_COOKIE',
      );

      const hook = beforeRequest('myapp.', undefined, undefined);
      const result = hook(makeConfig());

      expect(result.headers).toEqual(
        expect.objectContaining({
          'x-descope-refresh-cookie-name': 'PREFIXED_COOKIE',
        }),
      );
    });

    it('should NOT read DSRCN without prefix when prefix is set', () => {
      // Only the non-prefixed key exists; hook uses prefix so should not find it
      localStorage.setItem(REFRESH_COOKIE_NAME_KEY, 'NO_PREFIX_COOKIE');

      const hook = beforeRequest('myapp.', undefined, undefined);
      const result = hook(makeConfig());

      expect(result.headers?.['x-descope-refresh-cookie-name']).toBeUndefined();
    });

    it('should preserve existing request headers', () => {
      localStorage.setItem(REFRESH_COOKIE_NAME_KEY, 'MY_SERVER_COOKIE');

      const hook = beforeRequest('', undefined, undefined);
      const result = hook(
        makeConfig({ headers: { 'X-Custom': 'custom-value' } }),
      );

      expect(result.headers).toEqual({
        'X-Custom': 'custom-value',
        'x-descope-refresh-cookie-name': 'MY_SERVER_COOKIE',
      });
    });

    it('should add both DSRCN and DTD headers when both are stored', () => {
      localStorage.setItem(REFRESH_COOKIE_NAME_KEY, 'MY_SERVER_COOKIE');
      localStorage.setItem(TRUSTED_DEVICE_TOKEN_KEY, 'my-dtd-token');

      const hook = beforeRequest('', undefined, undefined);
      const result = hook(makeConfig());

      expect(result.headers).toEqual({
        'x-descope-refresh-cookie-name': 'MY_SERVER_COOKIE',
        'x-descope-trusted-device-token': 'my-dtd-token',
      });
    });
  });

  describe('when SDK config refreshCookieName is set', () => {
    it('should NOT inject DSRCN header (SDK config is handled by core-sdk)', () => {
      localStorage.setItem(REFRESH_COOKIE_NAME_KEY, 'SERVER_COOKIE');

      const hook = beforeRequest('', undefined, 'SDK_CONFIG_COOKIE');
      const result = hook(makeConfig());

      // The hook must not add the header; core-sdk's createDescopeHeaders handles it
      expect(result.headers?.['x-descope-refresh-cookie-name']).toBeUndefined();
    });

    it('should still add DTD header even when SDK refreshCookieName is set', () => {
      localStorage.setItem(REFRESH_COOKIE_NAME_KEY, 'SERVER_COOKIE');
      localStorage.setItem(TRUSTED_DEVICE_TOKEN_KEY, 'dtd-token');

      const hook = beforeRequest('', undefined, 'SDK_CONFIG_COOKIE');
      const result = hook(makeConfig());

      expect(result.headers).toEqual({
        'x-descope-trusted-device-token': 'dtd-token',
      });
      expect(result.headers?.['x-descope-refresh-cookie-name']).toBeUndefined();
    });
  });

  describe('when DSRCN is not in localStorage', () => {
    it('should NOT add x-descope-refresh-cookie-name header', () => {
      const hook = beforeRequest('', undefined, undefined);
      const result = hook(makeConfig());

      expect(result.headers?.['x-descope-refresh-cookie-name']).toBeUndefined();
    });

    it('should still add DTD header if DTD is present', () => {
      localStorage.setItem(TRUSTED_DEVICE_TOKEN_KEY, 'dtd-token');

      const hook = beforeRequest('', undefined, undefined);
      const result = hook(makeConfig());

      expect(result.headers).toEqual({
        'x-descope-trusted-device-token': 'dtd-token',
      });
      expect(result.headers?.['x-descope-refresh-cookie-name']).toBeUndefined();
    });

    it('should leave headers undefined when nothing to add', () => {
      const hook = beforeRequest('', undefined, undefined);
      const result = hook(makeConfig());

      expect(result.headers).toBeUndefined();
    });
  });
});
