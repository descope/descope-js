import { OidcClient } from 'oidc-client-ts';
import createOidc from '../src/sdk/oidc';
import { CoreSdk } from '../src/types';

jest.mock('oidc-client-ts', () => {
  return {
    OidcClient: jest.fn().mockImplementation(() => ({
      createSigninRequest: jest.fn(),
      processSigninResponse: jest.fn(),
      createSignoutRequest: jest.fn(),
    })),
    WebStorageStateStore: jest.fn(),
  };
});

describe('OIDC', () => {
  let sdk: CoreSdk;

  beforeAll(() => {
    sdk = {
      httpClient: {
        buildUrl: jest.fn().mockReturnValue('http://example.com'),
      },
      refresh: jest.fn(),
    } as unknown as CoreSdk;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const unload = () =>
      setTimeout(() => window.dispatchEvent(new Event('unload')), 200);

    const location = Object.defineProperties(
      {},
      {
        ...Object.getOwnPropertyDescriptors(window.location),
        assign: {
          enumerable: true,
          value: jest.fn(unload),
        },
        replace: {
          enumerable: true,
          value: jest.fn(unload),
        },
      },
    );
    Object.defineProperty(window, 'location', {
      enumerable: true,
      get: () => location,
    });
  });

  describe('loginWithRedirect', () => {
    it('should call createSigninRequest with correct params', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const oidc = createOidc(sdk, 'projectID');
      const response = await oidc.loginWithRedirect();

      expect(mockCreateSigninRequest).toHaveBeenCalledWith({});
      expect(response).toEqual({ ok: true, data: { url: 'mockUrl' } });
    });

    it('should pass custom parameters to createSigninRequest', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const oidc = createOidc(sdk, 'projectID');
      await oidc.loginWithRedirect({ login_hint: 'test@example.com' });

      expect(mockCreateSigninRequest).toHaveBeenCalledWith({
        login_hint: 'test@example.com',
      });
    });

    it('should handle errors during authorization', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockRejectedValue(new Error('Authorization failed'));
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const oidc = createOidc(sdk, 'projectID');
      await expect(oidc.loginWithRedirect()).rejects.toThrow(
        'Authorization failed',
      );
    });
  });

  describe('finishLogin', () => {
    it('should call processSigninResponse and sdk.refresh with correct params', async () => {
      const mockResponse = {
        refresh_token: 'mockRefreshToken',
      };
      const mockProcessSigninResponse = jest
        .fn()
        .mockResolvedValue(mockResponse);
      (OidcClient as jest.Mock).mockImplementation(() => ({
        processSigninResponse: mockProcessSigninResponse,
      }));

      const oidc = createOidc(sdk, 'projectId');
      const response = await oidc.finishLogin();

      expect(mockProcessSigninResponse).toHaveBeenCalledWith(
        window.location.href,
      );
      expect(response).toEqual(mockResponse);
    });

    it('should handle errors during finish authorization processing', async () => {
      const mockProcessSigninResponse = jest
        .fn()
        .mockRejectedValue(new Error('Token processing failed'));
      (OidcClient as jest.Mock).mockImplementation(() => ({
        processSigninResponse: mockProcessSigninResponse,
      }));

      const oidc = createOidc(sdk, 'projectID');
      await expect(oidc.finishLogin()).rejects.toThrow(
        'Token processing failed',
      );
    });
  });

  describe('finishLoginIfNeeded', () => {
    it('should not call processSigninResponse if query params are not set', async () => {
      const mockProcessSigninResponse = jest
        .fn()
        .mockRejectedValue('should not be called');
      (OidcClient as jest.Mock).mockImplementation(() => ({
        processSigninResponse: mockProcessSigninResponse,
      }));

      const oidc = createOidc(sdk, 'projectId');
      await oidc.finishLoginIfNeed();

      expect(mockProcessSigninResponse).not.toHaveBeenCalledWith();
    });

    it('should handle errors during finish authorization processing', async () => {
      const mockProcessSigninResponse = jest.fn().mockResolvedValue({});
      (OidcClient as jest.Mock).mockImplementation(() => ({
        processSigninResponse: mockProcessSigninResponse,
      }));

      // mock query params
      const unload = () =>
        setTimeout(() => window.dispatchEvent(new Event('unload')), 200);

      const location = Object.defineProperties(
        {},
        {
          ...Object.getOwnPropertyDescriptors(window.location),
          assign: {
            enumerable: true,
            value: jest.fn(unload),
          },
          replace: {
            enumerable: true,
            value: jest.fn(unload),
          },
          search: {
            enumerable: true,
            configurable: true,
            get: () => '?code=123&state=456', // ✅ key change
          },
        },
      );
      Object.defineProperty(window, 'location', {
        enumerable: true,
        get: () => location,
      });

      const oidc = createOidc(sdk, 'projectID');
      const response = await oidc.finishLoginIfNeed();
      expect(mockProcessSigninResponse).toHaveBeenCalledWith(
        window.location.href,
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockResponse = {
        id_token: 'newIdToken',
        refresh_token: 'newRefreshToken',
      };
      const mockUseRefreshToken = jest.fn().mockResolvedValue(mockResponse);
      (OidcClient as jest.Mock).mockImplementation(() => ({
        useRefreshToken: mockUseRefreshToken,
      }));

      // Mock localStorage
      const mockUser = {
        id_token: 'oldToken',
        session_state: 'sessionState',
        profile: { sub: 'user123' },
      };
      Storage.prototype.getItem = jest
        .fn()
        .mockReturnValue(JSON.stringify(mockUser));

      const oidc = createOidc(sdk, 'projectID');
      const response = await oidc.refreshToken('oldRefreshToken');

      expect(mockUseRefreshToken).toHaveBeenCalledWith({
        state: {
          refresh_token: 'oldRefreshToken',
          session_state: 'sessionState',
          profile: { sub: 'user123' },
        },
      });
      expect(response).toEqual(mockResponse);
    });

    it('should handle missing user in storage', async () => {
      Storage.prototype.getItem = jest.fn().mockReturnValue(null);

      const oidc = createOidc(sdk, 'projectID');
      await expect(oidc.refreshToken('refreshToken')).rejects.toThrow(
        'User not found in storage to refresh token',
      );
    });
  });

  describe('logout', () => {
    it('should call createSignoutRequest with correct params', async () => {
      const mockCreateSignoutRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockLogoutUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSignoutRequest: mockCreateSignoutRequest,
      }));

      const oidc = createOidc(sdk, 'projectID');

      await oidc.logout();

      expect(mockCreateSignoutRequest).toHaveBeenCalled();
      expect(window.location.replace).toHaveBeenCalledWith('mockLogoutUrl');
    });

    it('should handle custom logout parameters', async () => {
      const mockCreateSignoutRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockLogoutUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSignoutRequest: mockCreateSignoutRequest,
      }));

      const oidc = createOidc(sdk, 'projectID');
      const customLogoutParams = {
        id_token_hint: 'customToken',
        post_logout_redirect_uri: 'https://custom-redirect.com',
      };

      await oidc.logout(customLogoutParams);

      expect(mockCreateSignoutRequest).toHaveBeenCalledWith(customLogoutParams);
      expect(window.location.replace).toHaveBeenCalledWith('mockLogoutUrl');
    });

    it('should clear user from localStorage on logout', async () => {
      const mockCreateSignoutRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockLogoutUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSignoutRequest: mockCreateSignoutRequest,
      }));

      Storage.prototype.removeItem = jest.fn();

      const oidc = createOidc(sdk, 'projectID');
      await oidc.logout();

      expect(localStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('OIDC initialization', () => {
    it('should initialize with application ID', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const oidc = createOidc(sdk, 'projectID', { applicationId: 'app123' });
      await oidc.loginWithRedirect();

      expect(sdk.httpClient.buildUrl).toHaveBeenCalledWith('projectID');
      expect(OidcClient).toHaveBeenCalledWith(
        expect.objectContaining({
          authority: 'http://example.com/app123',
          client_id: 'projectID',
          scope: 'openid email roles descope.custom_claims offline_access',
        }),
      );
    });

    it('should initialize with custom issuer and clientId', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const oidc = createOidc(sdk, 'projectID', {
        issuer: 'https://custom-issuer.com',
        clientId: 'custom-client-id',
      });
      await oidc.loginWithRedirect({}, true);

      expect(OidcClient).toHaveBeenCalledWith(
        expect.objectContaining({
          authority: 'https://custom-issuer.com',
          client_id: 'custom-client-id',
          scope: 'openid',
        }),
      );
    });

    it('should throw error when issuer is provided without clientId', async () => {
      const oidc = createOidc(sdk, 'projectID', {
        issuer: 'https://custom-issuer.com',
      });

      await expect(oidc.loginWithRedirect({}, true)).rejects.toThrow(
        'clientId is required when providing a custom issuer/authority',
      );
    });

    it('should use custom scope when issuer and clientId are provided', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const oidc = createOidc(sdk, 'projectID', {
        issuer: 'https://custom-issuer.com',
        clientId: 'custom-client-id',
        scope: 'openid profile email',
      });
      await oidc.loginWithRedirect({}, true);

      expect(OidcClient).toHaveBeenCalledWith(
        expect.objectContaining({
          authority: 'https://custom-issuer.com',
          client_id: 'custom-client-id',
          scope: 'openid profile email',
        }),
      );
    });

    it('should initialize with inbound apps issuer and clientId', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      // Mock buildUrl to return base URL for inbound apps
      (sdk.httpClient.buildUrl as jest.Mock).mockReturnValue(
        'http://example.com',
      );

      const oidc = createOidc(sdk, 'projectID', {
        issuer: 'http://example.com/v1/apps/projectID',
        clientId: 'inbound-client-id',
      });
      await oidc.loginWithRedirect({}, true);

      expect(OidcClient).toHaveBeenCalledWith(
        expect.objectContaining({
          authority: 'http://example.com/v1/apps/projectID',
          client_id: 'inbound-client-id',
          scope: 'openid',
        }),
      );
    });

    it('should use default scope when no issuer is provided', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const oidc = createOidc(sdk, 'projectID');
      await oidc.loginWithRedirect({}, true);

      expect(OidcClient).toHaveBeenCalledWith(
        expect.objectContaining({
          authority: 'http://example.com',
          client_id: 'projectID',
          scope: 'openid email roles descope.custom_claims offline_access',
        }),
      );
    });

    it('should use custom scope when overriding default behavior', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const oidc = createOidc(sdk, 'projectID', {
        scope: 'openid profile',
      });
      await oidc.loginWithRedirect({}, true);

      expect(OidcClient).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'openid profile',
        }),
      );
    });
  });
});
