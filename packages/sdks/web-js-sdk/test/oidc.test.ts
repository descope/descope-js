import { OidcClient } from 'oidc-client-ts';
import createOidc from '../src/sdk/oidc';
import { CoreSdk } from '../src/types';

Object.defineProperty(global, 'Response', {
  value: class {
    body: string;
    constructor(body: string) {
      this.body = body;
    }
  },
  configurable: true,
  writable: true,
});

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
        hooks: {
          afterRequest: jest.fn(),
          beforeRequest: jest.fn(),
        },
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

    it('should call afterRequest hook before navigation', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const oidc = createOidc(sdk, 'projectID');
      await oidc.loginWithRedirect();

      expect(sdk.httpClient.hooks.afterRequest).toHaveBeenCalledWith(
        {},
        expect.any(Response),
      );
    });

    it('should not call afterRequest hook when navigation is disabled', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const oidc = createOidc(sdk, 'projectID');
      await oidc.loginWithRedirect({}, true);

      expect(sdk.httpClient.hooks.afterRequest).not.toHaveBeenCalled();
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
        resource: undefined,
      });
      expect(response).toEqual(mockResponse);
    });

    it('should pass resource to useRefreshToken so it keeps applying after a refresh', async () => {
      const mockResponse = {
        id_token: 'newIdToken',
        refresh_token: 'newRefreshToken',
      };
      const mockUseRefreshToken = jest.fn().mockResolvedValue(mockResponse);
      (OidcClient as jest.Mock).mockImplementation(() => ({
        useRefreshToken: mockUseRefreshToken,
      }));

      const mockUser = {
        id_token: 'oldToken',
        session_state: 'sessionState',
        profile: { sub: 'user123' },
      };
      Storage.prototype.getItem = jest
        .fn()
        .mockReturnValue(JSON.stringify(mockUser));

      const oidc = createOidc(sdk, 'projectID', {
        issuer: 'https://custom-issuer.com',
        clientId: 'custom-client-id',
        resource: 'https://api.example.com',
      });
      await oidc.refreshToken('oldRefreshToken');

      expect(mockUseRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'https://api.example.com',
        }),
      );
    });

    it('should handle missing user in storage', async () => {
      Storage.prototype.getItem = jest.fn().mockReturnValue(null);

      const oidc = createOidc(sdk, 'projectID');
      await expect(oidc.refreshToken('refreshToken')).rejects.toThrow(
        'User not found in storage to refresh token',
      );
    });
  });

  describe('resource persistence across signin -> finishLogin -> refreshToken', () => {
    // Use a real in-memory store rather than a fixed mockReturnValue, since this scenario
    // needs setItem/getItem/removeItem to actually round-trip across the three calls.
    let store: Map<string, string>;

    beforeEach(() => {
      store = new Map();
      Storage.prototype.getItem = jest.fn(
        (key: string) => store.get(key) ?? null,
      );
      Storage.prototype.setItem = jest.fn((key: string, value: string) => {
        store.set(key, value);
      });
      Storage.prototype.removeItem = jest.fn((key: string) => {
        store.delete(key);
      });
    });

    it('should persist a per-call resource so refreshToken honors it even when oidcConfig.resource is unset', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      const mockProcessSigninResponse = jest.fn().mockResolvedValue({
        id_token: 'idToken',
        session_state: 'sessionState',
        profile: { sub: 'user123' },
      });
      const mockUseRefreshToken = jest
        .fn()
        .mockResolvedValue({ id_token: 'newIdToken' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
        processSigninResponse: mockProcessSigninResponse,
        useRefreshToken: mockUseRefreshToken,
      }));

      // No `resource` set on oidcConfig - it's only ever passed per-call to loginWithRedirect.
      const oidc = createOidc(sdk, 'projectID', {
        issuer: 'https://custom-issuer.com',
        clientId: 'custom-client-id',
      });

      await oidc.loginWithRedirect(
        { resource: 'https://api.example.com' },
        true,
      );
      await oidc.finishLogin('https://my-app.com/redirect?code=1&state=2');
      await oidc.refreshToken('oldRefreshToken');

      expect(mockUseRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({ resource: 'https://api.example.com' }),
      );
      // the pending key used to ferry the resource across the redirect should be cleaned up
      expect(store.has('custom-client-id_user_pending_resource')).toBe(false);
    });

    it('should prefer a per-call resource over oidcConfig.resource for the signin that requested it', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      const mockProcessSigninResponse = jest.fn().mockResolvedValue({
        id_token: 'idToken',
        session_state: 'sessionState',
        profile: { sub: 'user123' },
      });
      const mockUseRefreshToken = jest
        .fn()
        .mockResolvedValue({ id_token: 'newIdToken' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
        processSigninResponse: mockProcessSigninResponse,
        useRefreshToken: mockUseRefreshToken,
      }));

      const oidc = createOidc(sdk, 'projectID', {
        issuer: 'https://custom-issuer.com',
        clientId: 'custom-client-id',
        resource: 'https://config-level.example.com',
      });

      await oidc.loginWithRedirect(
        { resource: 'https://per-call.example.com' },
        true,
      );
      await oidc.finishLogin('https://my-app.com/redirect?code=1&state=2');
      await oidc.refreshToken('oldRefreshToken');

      expect(mockUseRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({ resource: 'https://per-call.example.com' }),
      );
    });

    it('should persist a per-call audience (aliased to resource) so refreshToken honors it', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      const mockProcessSigninResponse = jest.fn().mockResolvedValue({
        id_token: 'idToken',
        session_state: 'sessionState',
        profile: { sub: 'user123' },
      });
      const mockUseRefreshToken = jest
        .fn()
        .mockResolvedValue({ id_token: 'newIdToken' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
        processSigninResponse: mockProcessSigninResponse,
        useRefreshToken: mockUseRefreshToken,
      }));

      const oidc = createOidc(sdk, 'projectID', {
        issuer: 'https://custom-issuer.com',
        clientId: 'custom-client-id',
      });

      await oidc.loginWithRedirect(
        { audience: 'https://per-call-audience.example.com' },
        true,
      );
      await oidc.finishLogin('https://my-app.com/redirect?code=1&state=2');
      await oidc.refreshToken('oldRefreshToken');

      expect(mockCreateSigninRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'https://per-call-audience.example.com',
        }),
      );
      expect(mockUseRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'https://per-call-audience.example.com',
        }),
      );
    });

    it('should pass a per-call audience (aliased to resource) to createSigninRequest even with no resource anywhere', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      // No `resource` set on oidcConfig or anywhere else - `audience` is the only thing
      // in play, and must still make it into the actual signin request as `resource`.
      const oidc = createOidc(sdk, 'projectID');
      await oidc.loginWithRedirect(
        { audience: 'https://per-call-audience.example.com' },
        true,
      );

      expect(mockCreateSigninRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'https://per-call-audience.example.com',
        }),
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

      // Mock buildUrl to mirror real behavior (`${baseUrl}/${projectId}`), so the inbound
      // app's `/v1/apps/{projectId}` issuer is correctly distinguished from a federated
      // authority sharing the same host. Use `mockReturnValueOnce` (rather than
      // `mockReturnValue`) so this override doesn't leak into later tests -
      // `jest.clearAllMocks()` in `beforeEach` clears call history but not implementations.
      (sdk.httpClient.buildUrl as jest.Mock).mockReturnValueOnce(
        'http://example.com/projectID',
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

    it('should normalize a well-known URL issuer to the bare issuer authority', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const oidc = createOidc(sdk, 'projectID', {
        issuer:
          'https://api.descope.com/v1/apps/P123/.well-known/openid-configuration',
        clientId: 'inbound-client-id',
      });
      await oidc.loginWithRedirect({}, true);

      expect(OidcClient).toHaveBeenCalledWith(
        expect.objectContaining({
          authority: 'https://api.descope.com/v1/apps/P123',
        }),
      );
    });

    it('should normalize a well-known URL issuer with a trailing slash', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const oidc = createOidc(sdk, 'projectID', {
        issuer:
          'https://api.descope.com/v1/apps/P123/.well-known/openid-configuration/',
        clientId: 'inbound-client-id',
      });
      await oidc.loginWithRedirect({}, true);

      expect(OidcClient).toHaveBeenCalledWith(
        expect.objectContaining({
          authority: 'https://api.descope.com/v1/apps/P123',
        }),
      );
    });

    it('should produce an identical authority across separate calls built from the same well-known URL (idempotence)', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const config = {
        issuer:
          'https://api.descope.com/v1/apps/P123/.well-known/openid-configuration',
        clientId: 'inbound-client-id',
      };

      await createOidc(sdk, 'projectID', config).loginWithRedirect({}, true);
      await createOidc(sdk, 'projectID', config).loginWithRedirect({}, true);

      const authorities = (OidcClient as jest.Mock).mock.calls.map(
        ([settings]) => settings.authority,
      );
      expect(authorities[0]).toBe(authorities[1]);
      expect(authorities[0]).toBe('https://api.descope.com/v1/apps/P123');
    });

    it('should prefer issuer over applicationId when both are provided', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const oidc = createOidc(sdk, 'projectID', {
        issuer: 'https://custom-issuer.com',
        clientId: 'custom-client-id',
        applicationId: 'app123',
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

    it('should default to openid scope for a custom-domain issuer that does not match the federated authority shape', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      // A custom domain that doesn't match `${buildUrl(projectId)}[/...]` - treated as an
      // inbound-style authority, so clientId is required and scope defaults to 'openid'.
      const oidc = createOidc(sdk, 'projectID', {
        issuer: 'https://totally-custom-domain.example.com',
        clientId: 'inbound-client-id',
      });
      await oidc.loginWithRedirect({}, true);

      expect(OidcClient).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'openid',
        }),
      );

      jest.clearAllMocks();
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const federatedOidc = createOidc(sdk, 'projectID', {
        applicationId: 'app123',
      });
      await federatedOidc.loginWithRedirect({}, true);

      expect(OidcClient).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'openid email roles descope.custom_claims offline_access',
        }),
      );
    });

    it('should auto-detect a federated-shaped issuer URL and default clientId to the projectId', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      // buildUrl(projectId) mocked to 'http://example.com' - a federated app's discovery URL
      // for that project is `http://example.com/projectID/.well-known/openid-configuration`.
      const oidc = createOidc(sdk, 'projectID', {
        issuer: 'http://example.com/projectID/.well-known/openid-configuration',
      });
      await oidc.loginWithRedirect({}, true);

      expect(OidcClient).toHaveBeenCalledWith(
        expect.objectContaining({
          authority: 'http://example.com/projectID',
          client_id: 'projectID',
          scope: 'openid email roles descope.custom_claims offline_access',
        }),
      );
    });

    it('should let clientId override the projectId default for a federated-shaped issuer URL', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const oidc = createOidc(sdk, 'projectID', {
        issuer: 'http://example.com/projectID/app123',
        clientId: 'custom-client-id',
      });
      await oidc.loginWithRedirect({}, true);

      expect(OidcClient).toHaveBeenCalledWith(
        expect.objectContaining({
          authority: 'http://example.com/projectID/app123',
          client_id: 'custom-client-id',
          scope: 'openid email roles descope.custom_claims offline_access',
        }),
      );
    });

    it('should not misclassify a matching issuer as a federated authority when projectId is falsy', async () => {
      // An empty projectId must never make isFederatedAuthority over-match: `buildUrl('')`
      // would otherwise degrade to a bare host with no path, and any issuer under that host
      // (including this one, which equals the default mocked buildUrl return value) would be
      // wrongly treated as federated - silently skipping the clientId requirement.
      const oidc = createOidc(sdk, '', {
        issuer: 'http://example.com',
      });

      await expect(oidc.loginWithRedirect({}, true)).rejects.toThrow(
        'clientId is required when providing a custom issuer/authority',
      );
    });

    it('should pass a string resource to the OidcClient constructor', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const oidc = createOidc(sdk, 'projectID', {
        issuer: 'https://custom-issuer.com',
        clientId: 'custom-client-id',
        resource: 'https://api.example.com',
      });
      await oidc.loginWithRedirect({}, true);

      expect(OidcClient).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'https://api.example.com',
        }),
      );
    });

    it('should pass an array resource to the OidcClient constructor', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const oidc = createOidc(sdk, 'projectID', {
        issuer: 'https://custom-issuer.com',
        clientId: 'custom-client-id',
        resource: ['https://api-a.example.com', 'https://api-b.example.com'],
      });
      await oidc.loginWithRedirect({}, true);

      expect(OidcClient).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: ['https://api-a.example.com', 'https://api-b.example.com'],
        }),
      );
    });

    it('should treat oidcConfig.audience as an alias for oidcConfig.resource', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const oidc = createOidc(sdk, 'projectID', {
        issuer: 'https://custom-issuer.com',
        clientId: 'custom-client-id',
        audience: 'https://api.example.com',
      });
      await oidc.loginWithRedirect({}, true);

      expect(OidcClient).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'https://api.example.com',
        }),
      );
    });

    it('should treat an array oidcConfig.audience as an alias for oidcConfig.resource', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const oidc = createOidc(sdk, 'projectID', {
        issuer: 'https://custom-issuer.com',
        clientId: 'custom-client-id',
        audience: ['https://api-a.example.com', 'https://api-b.example.com'],
      });
      await oidc.loginWithRedirect({}, true);

      expect(OidcClient).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: ['https://api-a.example.com', 'https://api-b.example.com'],
        }),
      );
    });

    it('should prefer oidcConfig.resource over oidcConfig.audience when both are provided', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const oidc = createOidc(sdk, 'projectID', {
        issuer: 'https://custom-issuer.com',
        clientId: 'custom-client-id',
        resource: 'https://resource-wins.example.com',
        audience: 'https://audience-loses.example.com',
      });
      await oidc.loginWithRedirect({}, true);

      expect(OidcClient).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'https://resource-wins.example.com',
        }),
      );
    });
  });
});
