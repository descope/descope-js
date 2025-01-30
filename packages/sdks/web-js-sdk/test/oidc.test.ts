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

  describe('authorize', () => {
    it('should call createSigninRequest with correct params', async () => {
      const mockCreateSigninRequest = jest
        .fn()
        .mockResolvedValue({ url: 'mockUrl' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        createSigninRequest: mockCreateSigninRequest,
      }));

      const oidc = createOidc(sdk, 'projectID');
      const response = await oidc.authorize();

      expect(mockCreateSigninRequest).toHaveBeenCalledWith({});
      expect(response).toEqual({ ok: true, data: { url: 'mockUrl' } });
    });
  });

  describe('token', () => {
    it('should call processSigninResponse and sdk.refresh with correct params', async () => {
      const mockProcessSigninResponse = jest
        .fn()
        .mockResolvedValue({ refresh_token: 'mockRefreshToken' });
      (OidcClient as jest.Mock).mockImplementation(() => ({
        processSigninResponse: mockProcessSigninResponse,
      }));

      const oidc = createOidc(sdk, 'projectID');
      const response = await oidc.token();

      expect(mockProcessSigninResponse).toHaveBeenCalledWith(
        window.location.href,
      );
      expect(sdk.refresh).toHaveBeenCalledWith('mockRefreshToken');
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
  });
});
