import { getAuthInfoFromResponse } from '../src/enhancers/helpers';
import { authInfo, oidcAuthInfo } from './mocks';

describe('helpers', () => {
  describe('getAuthInfoFromResponse', () => {
    it('should return empty object if response is not ok', async () => {
      const res = { ok: false } as Response;
      const result = await getAuthInfoFromResponse(res);
      expect(result).toEqual({});
    });

    it('should return authInfo from top level auth info response', async () => {
      const res = {
        ok: true,
        clone: () => ({ json: () => authInfo }),
      } as never as Response;
      const result = await getAuthInfoFromResponse(res);
      expect(result).toEqual(authInfo);
    });

    it('should return authInfo from response with authInfo attribute', async () => {
      const res = {
        ok: true,
        clone: () => ({ json: () => ({ authInfo }) }),
      } as never as Response;
      const result = await getAuthInfoFromResponse(res);
      expect(result).toEqual(authInfo);
    });

    it('should normalize OIDC response to authInfo format', async () => {
      const res = {
        ok: true,
        clone: () => ({ json: () => oidcAuthInfo }),
      } as never as Response;
      const result = await getAuthInfoFromResponse(res);

      expect(result.sessionJwt).toEqual(oidcAuthInfo.access_token);
      expect(result.refreshJwt).toEqual(oidcAuthInfo.refresh_token);
      expect(result.idToken).toEqual(oidcAuthInfo.id_token);
      expect(result.user).toEqual(oidcAuthInfo.user);

      // Verify expiration calculations
      const now = Math.floor(Date.now() / 1000);
      expect(result.sessionExpiration).toBeGreaterThan(now);
      expect(result.cookieExpiration).toBeGreaterThan(now + 2419000); // Roughly 28 days
    });
  });
});
