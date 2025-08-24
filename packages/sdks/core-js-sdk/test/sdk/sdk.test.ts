// @ts-nocheck
import createSdk from '../../src/sdk';
import { jwtDecode } from 'jwt-decode';
import { mockHttpClient } from '../utils';
import { apiPaths } from '../../src/constants';

jest.mock('jwt-decode', () => {
  return {
    jwtDecode: jest.fn(),
  };
});

const sdk = createSdk(mockHttpClient);

describe('sdk', () => {
  afterEach(() => {
    mockHttpClient.reset();
  });

  describe('refresh', () => {
    it('should throw an error when token is not a string', () => {
      expect(() => sdk.refresh({ a: 'b' })).toThrow(
        '"token" must be string or undefined',
      );
    });
    it('should send the correct request', () => {
      const httpRespJson = { key: 'val' };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);

      sdk.refresh('token');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.refresh,
        {},
        {
          token: 'token',
        },
      );
    });

    it('should send external token', () => {
      const httpRespJson = { key: 'val' };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);

      sdk.refresh('token', undefined, 'external-token');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.refresh,
        {
          externalToken: 'external-token',
        },
        {
          token: 'token',
        },
      );
    });

    it('should try-refresh', () => {
      const httpRespJson = { key: 'val' };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);

      sdk.refresh('token', undefined, undefined, true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.tryRefresh,
        {},
        {
          token: 'token',
        },
      );
    });
  });

  describe('selectTenant', () => {
    it('should throw an error when token is not a string', () => {
      expect(() => sdk.selectTenant('tenantId', { a: 'b' })).toThrow(
        '"token" must be string or undefined',
      );
    });
    it('should send the correct request', () => {
      const httpRespJson = { key: 'val' };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);

      sdk.selectTenant('tenantId', 'token');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.selectTenant,
        {
          tenant: 'tenantId',
        },
        {
          token: 'token',
        },
      );
    });
  });

  describe('isJwtExpired', () => {
    it('should throw an error when token is not a string', () => {
      expect(sdk.isJwtExpired).toThrow('"token" must be a string');
    });

    it('should throw an error when token is empty', () => {
      expect(() => sdk.isJwtExpired('')).toThrow('"token" must not be empty');
    });

    it('should return true if the JWT is expired', () => {
      (jwtDecode as jest.Mock).mockImplementationOnce(() => ({ exp: 12345 }));
      expect(sdk.isJwtExpired('jwt')).toBe(true);
    });

    it('should return false if the JWT is expired', () => {
      (jwtDecode as jest.Mock).mockImplementationOnce(() => ({
        exp: (new Date().getTime() + 10000) / 1000,
      }));
      expect(sdk.isJwtExpired('jwt')).toBe(false);
    });
  });

  describe('getJwtPermissions', () => {
    const mock = {
      permissions: ['foo', 'bar'],
      tenants: {
        C2EdY4UXXzKPV0EKdZFJbuKKmvtl: {
          roles: ['abc', 'xyz'],
        },
        C2EdY4UXXzKPV0EKdZFJbuKKmvtm: {
          roles: ['def'],
        },
      },
    };

    const mockNoTenantsToken = {
      permissions: ['p1', 'p2'],
      roles: ['r1', 'r2'],
      dct: 't1',
    };

    it('should return two permissions', () => {
      (jwtDecode as jest.Mock).mockImplementation(() => mock);
      expect(sdk.getJwtPermissions('jwt')).toStrictEqual(['foo', 'bar']);
    });
    it('should return empty roles', () => {
      (jwtDecode as jest.Mock).mockImplementation(() => mock);
      expect(sdk.getJwtRoles('jwt')).toStrictEqual([]);
    });
    it('should return empty permissions for tenant', () => {
      (jwtDecode as jest.Mock).mockImplementation(() => mock);
      expect(
        sdk.getJwtPermissions('jwt', 'C2EdY4UXXzKPV0EKdZFJbuKKmvtl'),
      ).toStrictEqual([]);
    });
    it('should return two roles for tenant', () => {
      (jwtDecode as jest.Mock).mockImplementation(() => mock);
      expect(
        sdk.getJwtRoles('jwt', 'C2EdY4UXXzKPV0EKdZFJbuKKmvtl'),
      ).toStrictEqual(['abc', 'xyz']);
    });
    it('should return a list of tenants', () => {
      (jwtDecode as jest.Mock).mockImplementation(() => mock);
      expect(sdk.getTenants('jwt')).toStrictEqual([
        'C2EdY4UXXzKPV0EKdZFJbuKKmvtl',
        'C2EdY4UXXzKPV0EKdZFJbuKKmvtm',
      ]);
    });
    it('should return current tenant permissions', () => {
      (jwtDecode as jest.Mock).mockImplementation(() => mockNoTenantsToken);
      expect(sdk.getJwtPermissions('jwt', 't1')).toStrictEqual(['p1', 'p2']);
    });
    it('should return current tenant roles', () => {
      (jwtDecode as jest.Mock).mockImplementation(() => mockNoTenantsToken);
      expect(sdk.getJwtRoles('jwt', 't1')).toStrictEqual(['r1', 'r2']);
    });
    it('should return empty tenant permissions if tenant does not match', () => {
      (jwtDecode as jest.Mock).mockImplementation(() => mockNoTenantsToken);
      expect(sdk.getJwtPermissions('jwt', 't2')).toStrictEqual([]);
    });
    it('should return empty tenant roles if tenant does not match', () => {
      (jwtDecode as jest.Mock).mockImplementation(() => mockNoTenantsToken);
      expect(sdk.getJwtRoles('jwt', 't2')).toStrictEqual([]);
    });
  });

  describe('getCurrentTenant', () => {
    it('should throw an error when token is not a string', () => {
      expect(sdk.getCurrentTenant).toThrow('"token" must be a string');
    });
    it('should return the current tenant', () => {
      (jwtDecode as jest.Mock).mockImplementation(() => ({
        dct: 'current-tenant',
      }));
      expect(sdk.getCurrentTenant('jwt')).toBe('current-tenant');
    });
    it('should gracefully handle jwt decoding error', () => {
      (jwtDecode as jest.Mock).mockImplementation(() => new Error('error'));
      expect(sdk.getCurrentTenant('jwt')).toBeFalsy();
    });
  });

  describe('logout', () => {
    it('should throw an error when token is not a string', () => {
      expect(() => sdk.logout({ a: 'b' })).toThrow(
        '"token" must be string or undefined',
      );
    });

    it('should not throw an error when token is undefined', () => {
      expect(() => sdk.logout()).not.toThrow();
    });

    it('should send the correct request', () => {
      const httpRespJson = { key: 'val' };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);

      sdk.logout('token');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.logout,
        {},
        { token: 'token' },
      );
    });
  });

  describe('logoutAll', () => {
    it('should throw an error when token is not a string', () => {
      expect(() => sdk.logoutAll({ a: 'b' })).toThrow(
        '"token" must be string or undefined',
      );
    });
    it('should send the correct request', () => {
      const httpRespJson = { key: 'val' };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);

      sdk.logoutAll('token');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.logoutAll,
        {},
        { token: 'token' },
      );
    });
  });

  describe('me', () => {
    it('should throw an error when token is not a string', () => {
      expect(() => sdk.me({ a: 'b' })).toThrow(
        '"token" must be string or undefined',
      );
    });
    it('should send the correct request', () => {
      const httpRespJson = { key: 'val' };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.get.mockResolvedValue(httpResponse);

      sdk.me('token');
      expect(mockHttpClient.get).toHaveBeenCalledWith(apiPaths.me, {
        token: 'token',
      });
    });
  });

  describe('myTenants', () => {
    it('should throw an error when tenant is not a valid input', () => {
      expect(() => sdk.myTenants({ a: 'b' })).toThrow(
        '"tenants" must a string array or a boolean',
      );
    });

    it('should throw an error when token is not a string', () => {
      expect(() => sdk.myTenants(true, { a: 'b' })).toThrow(
        '"token" must be string',
      );
    });
    it('should send the correct request with boolean', () => {
      const httpRespJson = { key: 'val' };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);

      sdk.myTenants(true, 'token');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.myTenants,
        {
          dct: true,
        },
        { token: 'token' },
      );
    });
    it('should send the correct request with array', () => {
      const httpRespJson = { key: 'val' };
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.post.mockResolvedValue(httpResponse);

      sdk.myTenants(['a'], 'token');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        apiPaths.myTenants,
        {
          ids: ['a'],
        },
        { token: 'token' },
      );
    });
  });

  describe('history', () => {
    it('should throw an error when token is not a string', () => {
      expect(() => sdk.history({ a: 'b' })).toThrow(
        '"token" must be string or undefined',
      );
    });
    it('should send the correct request', () => {
      const httpRespJson = [
        {
          userId: 'some-id-1',
          loginTime: 12,
          city: 'aa-1',
          country: 'bb-1',
          ip: 'cc-1',
        },
        {
          userId: 'some-id-2',
          loginTime: 21,
          city: 'aa-2',
          country: 'bb-2',
          ip: 'cc-2',
        },
      ];
      const httpResponse = {
        ok: true,
        json: () => httpRespJson,
        clone: () => ({
          json: () => Promise.resolve(httpRespJson),
        }),
        status: 200,
      };
      mockHttpClient.get.mockResolvedValue(httpResponse);

      sdk.history('token');
      expect(mockHttpClient.get).toHaveBeenCalledWith(apiPaths.history, {
        token: 'token',
      });
    });
  });
});
