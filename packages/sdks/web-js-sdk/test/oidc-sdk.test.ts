import createSdk from '../src/sdk';

const mockFetch = jest.fn().mockReturnValueOnce(new Promise(() => {}));
global.fetch = mockFetch;
Object.defineProperty(global, 'PublicKeyCredential', { value: class {} });

Object.defineProperty(global, 'Response', {
  value: class {},
  configurable: true,
  writable: true,
});

const mockUseRefreshToken = jest.fn().mockResolvedValue({});
const mockCreateSignoutRequest = jest.fn().mockResolvedValue({});

jest.mock('oidc-client-ts', () => {
  return {
    OidcClient: jest.fn().mockImplementation(() => ({
      createSigninRequest: jest.fn(),
      processSigninResponse: jest.fn(),
      createSignoutRequest: mockCreateSignoutRequest,
      useRefreshToken: mockUseRefreshToken,
    })),
    WebStorageStateStore: jest.fn(),
  };
});

describe('sdk', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseRefreshToken.mockClear();
  });

  describe('refresh', () => {
    it('should call oidc refresh when oidc config is set', async () => {
      localStorage.setItem(
        'pid_user',
        JSON.stringify({
          session_state: 'session-state-1',
          profile: { sub: 'user-1' },
        }),
      );

      const sdk = createSdk({ projectId: 'pid', oidcConfig: true });
      const res = await sdk.refresh('token');
      expect(res.ok).toBe(true);
      expect(mockUseRefreshToken).toHaveBeenCalledWith({
        state: {
          refresh_token: 'token',
          session_state: 'session-state-1',
          profile: { sub: 'user-1' },
        },
      });
    });

    it('should handle use refresh token error', async () => {
      localStorage.setItem(
        'pid_user',
        JSON.stringify({
          session_state: 'session-state-1',
          profile: { sub: 'user-1' },
        }),
      );

      mockUseRefreshToken.mockRejectedValueOnce(new Error('error'));

      const sdk = createSdk({ projectId: 'pid', oidcConfig: true });
      const res = await sdk.refresh('token');
      expect(res.ok).toBe(false);
    });
  });

  describe('logout', () => {
    it('should call oidc logout with id token from storage when oidc config is set', async () => {
      // set DSI in local storage
      localStorage.setItem('DSI', 'id-token-1');
      const sdk = createSdk({ projectId: 'pid', oidcConfig: true });
      const res = await sdk.logout();
      expect(res.ok).toBe(true);
      expect(mockCreateSignoutRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          id_token_hint: 'id-token-1',
        }),
      );
    });

    it('should call oidc logout with token argument when oidc config is set', async () => {
      // set DSI in local storage
      localStorage.setItem('DSI', 'id-token-1');
      const sdk = createSdk({ projectId: 'pid', oidcConfig: true });
      const res = await sdk.logout('id-token-2');
      expect(res.ok).toBe(true);
      expect(mockCreateSignoutRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          id_token_hint: 'id-token-2',
        }),
      );
    });

    it('should handle oidc logout error', async () => {
      mockCreateSignoutRequest.mockRejectedValueOnce(new Error('error'));
      const sdk = createSdk({ projectId: 'pid', oidcConfig: true });
      const res = await sdk.logout();
      expect(res.ok).toBe(false);
    });
  });

  describe('OIDC configuration', () => {
    it('should work with custom issuer and clientId', async () => {
      localStorage.setItem(
        'custom-client-id_user',
        JSON.stringify({
          session_state: 'session-state-1',
          profile: { sub: 'user-1' },
        }),
      );

      const sdk = createSdk({
        projectId: 'pid',
        oidcConfig: {
          issuer: 'https://custom-issuer.com',
          clientId: 'custom-client-id',
        },
      });

      const res = await sdk.refresh('token');
      expect(res.ok).toBe(true);
      expect(mockUseRefreshToken).toHaveBeenCalled();
    });

    it('should throw error when issuer is provided without clientId', async () => {
      const sdk = createSdk({
        projectId: 'pid',
        oidcConfig: {
          issuer: 'https://custom-issuer.com',
        },
      });

      await expect(sdk.oidc?.loginWithRedirect({}, true)).rejects.toThrow(
        'clientId is required when providing a custom issuer/authority',
      );
    });

    it('should use custom scope with issuer and clientId', async () => {
      const { OidcClient } = require('oidc-client-ts');
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const sdk = createSdk({
        projectId: 'pid',
        oidcConfig: {
          issuer: 'https://custom-issuer.com',
          clientId: 'custom-client-id',
          scope: 'openid profile email',
        },
      });

      await sdk.oidc?.loginWithRedirect({}, true);

      expect(OidcClient).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'openid profile email',
          authority: 'https://custom-issuer.com',
          client_id: 'custom-client-id',
        }),
      );
    });

    it('should default to openid scope when issuer and clientId are provided', async () => {
      const { OidcClient } = require('oidc-client-ts');
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const sdk = createSdk({
        projectId: 'pid',
        oidcConfig: {
          issuer: 'https://custom-issuer.com',
          clientId: 'custom-client-id',
        },
      });

      await sdk.oidc?.loginWithRedirect({}, true);

      expect(OidcClient).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'openid',
          authority: 'https://custom-issuer.com',
          client_id: 'custom-client-id',
        }),
      );
    });
  });
});
