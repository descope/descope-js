import { WebJWTResponse } from '../src/types';
import {
  persistTokens,
  getTrustedDeviceToken,
} from '../src/enhancers/withPersistTokens/helpers';
import { TRUSTED_DEVICE_TOKEN_KEY } from '../src/enhancers/withPersistTokens/constants';

jest.mock('js-cookie', () => ({
  set: jest.fn(),
  get: jest.fn(),
  remove: jest.fn(),
}));

describe('Trusted Device Token (DTD)', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('DTD persistence', () => {
    it('should store DTD with storage prefix in localStorage', () => {
      const authInfo: Partial<WebJWTResponse> = {
        sessionJwt: 'session-jwt',
        refreshJwt: 'refresh-jwt',
        trustedDeviceJwt: 'dtd-jwt-token',
        sessionExpiration: Date.now() / 1000 + 3600,
        cookieExpiration: Date.now() / 1000 + 86400,
        claims: {},
      };

      persistTokens(authInfo, false, 'myprefix-', false);

      expect(localStorage.getItem('myprefix-' + TRUSTED_DEVICE_TOKEN_KEY)).toBe(
        'dtd-jwt-token',
      );
    });

    it('should update DTD in localStorage when new value is provided', () => {
      // First, store old DTD
      localStorage.setItem(TRUSTED_DEVICE_TOKEN_KEY, 'old-dtd-token');

      const authInfo: Partial<WebJWTResponse> = {
        sessionJwt: 'session-jwt',
        refreshJwt: 'refresh-jwt',
        trustedDeviceJwt: 'new-dtd-jwt-token',
        sessionExpiration: Date.now() / 1000 + 3600,
        cookieExpiration: Date.now() / 1000 + 86400,
        claims: {},
      };

      persistTokens(authInfo, false, '', false);

      // DTD should be updated to new value
      expect(localStorage.getItem(TRUSTED_DEVICE_TOKEN_KEY)).toBe(
        'new-dtd-jwt-token',
      );
    });
  });

  describe('getTrustedDeviceToken', () => {
    it('should return empty string when DTD is not set in localStorage', () => {
      expect(getTrustedDeviceToken()).toBe('');
    });

    it('should retrieve DTD from localStorage', () => {
      localStorage.setItem(TRUSTED_DEVICE_TOKEN_KEY, 'my-localStorage-dtd');
      expect(getTrustedDeviceToken()).toBe('my-localStorage-dtd');
    });

    it('should retrieve DTD with storage prefix from localStorage', () => {
      const prefix = 'test-';
      localStorage.setItem(prefix + TRUSTED_DEVICE_TOKEN_KEY, 'my-dtd-token');
      expect(getTrustedDeviceToken(prefix)).toBe('my-dtd-token');
    });
  });
});
