import { isJwtExpired, pathJoin } from '../../src/sdk/helpers';
import jwtDecode from 'jwt-decode';
import {
  MAX_POLLING_TIMEOUT_MS,
  MIN_POLLING_INTERVAL_MS,
} from '../../src/constants';

jest.mock('jwt-decode', () => jest.fn());

describe('helpers', () => {
  describe('pathJoin', () => {
    it('should remove double slashes', () => {
      expect(pathJoin('///a///', '///b///')).toBe('/a/b/');
    });
    it('should add slashes between paths', () => {
      expect(pathJoin('a', 'b', 'c')).toBe('a/b/c');
    });
  });

  describe('isJwtExpired', () => {
    it('should return true if the JWT is expired', () => {
      (jwtDecode as jest.Mock).mockImplementationOnce(() => ({ exp: 12345 }));
      expect(isJwtExpired('123')).toBe(true);
    });

    it('should return false if the JWT is expired', () => {
      (jwtDecode as jest.Mock).mockImplementationOnce(() => ({
        exp: (new Date().getTime() + 10000) / 1000,
      }));
      expect(isJwtExpired('123')).toBe(false);
    });
  });
});
