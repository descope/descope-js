import createSdk, {
  refresh,
  getJwtPermissions,
  getJwtRoles,
  getRefreshToken,
  getSessionToken,
  isSessionTokenExpired,
  isRefreshTokenExpired,
  getCurrentTenant,
} from '../src/sdk';

jest.mock('@descope/web-js-sdk', () => () => ({
  getSessionToken: jest.fn(),
  getRefreshToken: jest.fn(),
  isJwtExpired: jest.fn(),
  getJwtPermissions: jest.fn(),
  getJwtRoles: jest.fn(),
  getCurrentTenant: jest.fn(),
  refresh: jest.fn(),
}));

const sdk = createSdk({ projectId: 'test' });

describe('utility functions', () => {
  it('should call getSessionToken from sdk', () => {
    getSessionToken();
    expect(sdk.getSessionToken).toHaveBeenCalled();
  });

  it('should warn when using getSessionToken in non browser environment', () => {
    const warnSpy = jest.spyOn(console, 'warn');

    const origWindow = window;
    Object.defineProperty(global, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    jest.resetModules();

    // eslint-disable-next-line global-require
    const { getSessionToken: getSessionTokenLocal } = require('../src/sdk');

    getSessionTokenLocal();

    global.window = origWindow;
    jest.resetModules();

    expect(warnSpy).toHaveBeenCalledWith(
      'Get session token is not supported in SSR',
    );
    expect(sdk.getSessionToken).not.toHaveBeenCalled();
  });

  it('should call getRefreshToken from sdk', () => {
    getRefreshToken();
    expect(sdk.getRefreshToken).toHaveBeenCalled();
  });

  it('should warn when using getRefreshToken in non browser environment', () => {
    const warnSpy = jest.spyOn(console, 'warn');

    const origWindow = window;
    Object.defineProperty(global, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    jest.resetModules();

    // eslint-disable-next-line global-require
    const { getRefreshToken: getRefreshTokenLocal } = require('../src/sdk');

    getRefreshTokenLocal();

    global.window = origWindow;
    jest.resetModules();

    expect(warnSpy).toHaveBeenCalledWith(
      'Get refresh token is not supported in SSR',
    );
    expect(sdk.getRefreshToken).not.toHaveBeenCalled();
  });

  it('should call refresh token with the session token', async () => {
    (sdk.refresh as jest.Mock).getMockImplementation();
    await refresh('test');
    expect(sdk.refresh).toHaveBeenCalledWith('test');
  });

  it('should call getJwtPermissions with the session token when not provided', () => {
    (sdk.getSessionToken as jest.Mock).mockReturnValueOnce('session');
    getJwtPermissions();
    expect(sdk.getJwtPermissions).toHaveBeenCalledWith('session', undefined);
  });

  it('should call isSessionJwtExpired with the session token when not provided', () => {
    (sdk.getSessionToken as jest.Mock).mockReturnValueOnce('session');
    jest.spyOn(sdk, 'isJwtExpired').mockReturnValueOnce(false);
    isSessionTokenExpired();
    expect(sdk.isJwtExpired).toHaveBeenCalledWith('session');
  });

  it('should call isRefreshJwtExpired with the refresh token when not provided', () => {
    (sdk.getRefreshToken as jest.Mock).mockReturnValueOnce('refresh');
    jest.spyOn(sdk, 'isJwtExpired').mockReturnValueOnce(false);
    isRefreshTokenExpired();
    expect(sdk.isJwtExpired).toHaveBeenCalledWith('refresh');
  });

  it('should call getJwtRoles with the session token when not provided', () => {
    (sdk.getSessionToken as jest.Mock).mockReturnValueOnce('session');
    jest.spyOn(sdk, 'getJwtRoles').mockReturnValueOnce([]);
    getJwtRoles();
    expect(sdk.getJwtRoles).toHaveBeenCalledWith('session', undefined);
  });

  it('should log error when calling getJwtRoles when the function throws error', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(sdk, 'getJwtRoles').mockImplementation(() => {
      throw new Error('session token');
    });
    getJwtRoles();
    expect(console.error).toHaveBeenCalled(); // eslint-disable-line no-console
  });

  it('should call getCurrentTenant with the session token when not provided', () => {
    (sdk.getSessionToken as jest.Mock).mockReturnValueOnce('session-token');
    jest.spyOn(sdk, 'getCurrentTenant').mockReturnValueOnce('t-1');
    expect(getCurrentTenant()).toBe('t-1');
    expect(sdk.getCurrentTenant).toHaveBeenCalledWith('session-token');
  });
});
