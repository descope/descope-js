import { WebJWTResponse } from '../src/types';
import {
  persistTokens,
  getKnownDeviceToken,
} from '../src/enhancers/withPersistTokens/helpers';
import { KNOWN_DEVICE_TOKEN_KEY } from '../src/enhancers/withPersistTokens/constants';

jest.mock('js-cookie', () => ({
  set: jest.fn(),
  get: jest.fn(),
  remove: jest.fn(),
}));

describe('Known Device Token (DKD)', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('DKD persistence', () => {
    it('should store DKD with storage prefix in localStorage', () => {
      const authInfo: Partial<WebJWTResponse> = {
        sessionJwt: 'session-jwt',
        refreshJwt: 'refresh-jwt',
        knownDeviceJwt: 'dkd-jwt-token',
        sessionExpiration: Date.now() / 1000 + 3600,
        cookieExpiration: Date.now() / 1000 + 86400,
        claims: {},
      };

      persistTokens(authInfo, false, 'myprefix-', false);

      expect(localStorage.getItem('myprefix-' + KNOWN_DEVICE_TOKEN_KEY)).toBe(
        'dkd-jwt-token',
      );
    });

    it('should update DKD in localStorage when new value is provided', () => {
      // First, store old DKD
      localStorage.setItem(KNOWN_DEVICE_TOKEN_KEY, 'old-dkd-token');

      const authInfo: Partial<WebJWTResponse> = {
        sessionJwt: 'session-jwt',
        refreshJwt: 'refresh-jwt',
        knownDeviceJwt: 'new-dkd-jwt-token',
        sessionExpiration: Date.now() / 1000 + 3600,
        cookieExpiration: Date.now() / 1000 + 86400,
        claims: {},
      };

      persistTokens(authInfo, false, '', false);

      // DKD should be updated to new value
      expect(localStorage.getItem(KNOWN_DEVICE_TOKEN_KEY)).toBe(
        'new-dkd-jwt-token',
      );
    });

    it('should persist DKD even when a trustedDeviceJwt is also present in the same response', () => {
      // Persistence is unconditional regardless of trusted-device state - only the outgoing
      // header selection in beforeRequest prefers DTD over DKD, not storage.
      const authInfo: Partial<WebJWTResponse> = {
        sessionJwt: 'session-jwt',
        refreshJwt: 'refresh-jwt',
        trustedDeviceJwt: 'dtd-jwt-token',
        knownDeviceJwt: 'dkd-jwt-token',
        sessionExpiration: Date.now() / 1000 + 3600,
        cookieExpiration: Date.now() / 1000 + 86400,
        claims: {},
      };

      persistTokens(authInfo, false, '', false);

      expect(localStorage.getItem(KNOWN_DEVICE_TOKEN_KEY)).toBe(
        'dkd-jwt-token',
      );
    });
  });

  describe('getKnownDeviceToken', () => {
    it('should return empty string when DKD is not set in localStorage', () => {
      expect(getKnownDeviceToken()).toBe('');
    });

    it('should retrieve DKD from localStorage', () => {
      localStorage.setItem(KNOWN_DEVICE_TOKEN_KEY, 'my-localStorage-dkd');
      expect(getKnownDeviceToken()).toBe('my-localStorage-dkd');
    });

    it('should retrieve DKD with storage prefix from localStorage', () => {
      const prefix = 'test-';
      localStorage.setItem(prefix + KNOWN_DEVICE_TOKEN_KEY, 'my-dkd-token');
      expect(getKnownDeviceToken(prefix)).toBe('my-dkd-token');
    });
  });
});
