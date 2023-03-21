import Cookies from 'js-cookie';
import { getSessionToken } from '../src/enhancers/withPersistTokens/helpers';
import createSdk from '../src/index';
import { authInfo } from './mocks';
import { createMockReturnValue } from './testUtils';

const descopeHeaders = {
  'x-descope-sdk-name': 'web-js',
  'x-descope-sdk-version': global.BUILD_VERSION,
};

const mockFetch = jest.fn().mockReturnValueOnce(new Promise(() => {}));
global.fetch = mockFetch;

jest.mock('js-cookie', () => ({
  set: jest.fn(),
  get: jest.fn(),
  remove: jest.fn(),
}));

describe('persistTokens', () => {
  afterEach(() => {
    localStorage.setItem('DSR', '');
  });
  it('should get refresh token from local storage', () => {
    const sdk = createSdk({ projectId: 'pid', persistTokens: true });
    localStorage.setItem('DSR', authInfo.refreshJwt);
    sdk.httpClient.get('1/2/3');

    expect(mockFetch).toHaveBeenCalledWith(
      new URL(`https://api.descope.com/1/2/3`),
      {
        body: undefined,
        headers: new Headers({
          Authorization: `Bearer pid:${authInfo.refreshJwt}`,
          ...descopeHeaders,
        }),
        method: 'GET',
        credentials: 'include',
      }
    );

    expect(sdk.getRefreshToken()).toEqual(authInfo.refreshJwt);
  });
  it('should set session token as cookie and refresh token to local storage when managing session token via cookie', async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(authInfo));
    global.fetch = mockFetch;

    const setMock = jest.spyOn(Cookies, 'set');

    const sdk = createSdk({
      projectId: 'pid',
      sessionTokenViaCookie: true,
      persistTokens: true,
    });
    await sdk.httpClient.get('1/2/3');

    await new Promise(process.nextTick);

    expect(setMock).toBeCalledWith('DS', authInfo.sessionJwt, {
      domain: authInfo.cookieDomain,
      path: authInfo.cookiePath,
      expires: new Date(authInfo.cookieExpiration * 1000),
      sameSite: 'Strict',
      secure: true,
    });
    expect(localStorage.getItem('DSR')).toEqual(authInfo.refreshJwt);
  });

  it('should not set refresh if persistTokens is configured to false', async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(authInfo));
    global.fetch = mockFetch;

    const sdk = createSdk({
      projectId: 'pid',
      autoRefresh: false,
      persistTokens: true,
    });
    const refreshSpy = jest
      .spyOn(sdk, 'refresh')
      .mockReturnValue(new Promise(() => {}));
    await sdk.httpClient.get('1/2/3');

    await new Promise(process.nextTick);

    expect(localStorage.getItem('DSR')).toBeTruthy();
    expect(refreshSpy).not.toBeCalled();
  });

  it('should not set storage if persistTokens is configured to false', async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(authInfo));
    global.fetch = mockFetch;

    const sdk = createSdk({ projectId: 'pid', persistTokens: false });
    await sdk.httpClient.get('1/2/3');

    const setMock = Cookies.set as jest.Mock;
    expect(setMock).not.toBeCalled();
  });

  describe('getSessionToken', () => {
    it('should get session from from cookie', async () => {
      const getMock = Cookies.get as jest.Mock;
      getMock.mockReturnValue('session-1');
      expect(getSessionToken()).toEqual('session-1');
      expect(getMock).toBeCalled();
    });

    it('should get session from from local storage', async () => {
      const getMock = Cookies.get as jest.Mock;
      getMock.mockReturnValue('');
      localStorage.setItem('DS', 'session-1');

      expect(getSessionToken()).toEqual('session-1');
    });

    it('afterRequest - should not set session token as cookie and refresh token to local storage when managing session token via cookie', async () => {
      const mockFetch = jest
        .fn()
        .mockReturnValue(createMockReturnValue(authInfo));
      global.fetch = mockFetch;

      const setMock = jest.spyOn(Cookies, 'set');

      const sdk = createSdk({ projectId: 'pid', sessionTokenViaCookie: true });
      await sdk.httpClient.get('1/2/3');

      await new Promise(process.nextTick);

      expect(setMock).not.toHaveBeenCalled();
      expect(localStorage.getItem('DSR')).not.toEqual(authInfo.refreshJwt);
    });

    it('should clear tokens on on logout', async () => {
      localStorage.setItem('DSR', authInfo.refreshJwt);
      // mock one response with auth info, and another one for logout
      const mockFetch = jest
        .fn()
        .mockReturnValueOnce(createMockReturnValue(authInfo))
        .mockReturnValue(createMockReturnValue({}));
      global.fetch = mockFetch;

      const sdk = createSdk({ projectId: 'pid', persistTokens: true });

      // Call something to simulate auth info
      await sdk.httpClient.get('1/2/3');

      await sdk.logout(authInfo.refreshJwt);

      expect(localStorage.getItem('DSR')).toBeFalsy();
      const removeMock = Cookies.remove as jest.Mock;
      expect(removeMock).toBeCalledWith('DS');
    });

    it('should clear tokens on logout even when not passing refresh token', async () => {
      localStorage.setItem('DSR', authInfo.refreshJwt);
      const mockFetch = jest.fn().mockReturnValue(createMockReturnValue({}));
      global.fetch = mockFetch;

      const sdk = createSdk({ projectId: 'pid', persistTokens: true });
      await sdk.logout();

      expect(localStorage.getItem('DSR')).toBeFalsy();
      const removeMock = Cookies.remove as jest.Mock;
      expect(removeMock).toBeCalledWith('DS');
    });

    it('should clear tokens on logoutAll even when not passing refresh token', async () => {
      localStorage.setItem('DSR', authInfo.refreshJwt);
      const mockFetch = jest.fn().mockReturnValue(createMockReturnValue({}));
      global.fetch = mockFetch;

      const sdk = createSdk({ projectId: 'pid', persistTokens: true });
      await sdk.logoutAll();

      expect(localStorage.getItem('DSR')).toBeFalsy();
      const removeMock = Cookies.remove as jest.Mock;
      expect(removeMock).toBeCalledWith('DS');
    });

    it('should log a warning when not running in the browser', () => {
      const warnSpy = jest.spyOn(console, 'warn');

      const origWindow = window;
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      jest.resetModules();

      const createSdk = require('../src').default;

      createSdk({ projectId: 'pid', persistTokens: true });

      global.window = origWindow;

      jest.resetModules();

      expect(warnSpy).toHaveBeenCalledWith(
        'Storing auth tokens in local storage and cookies are a client side only capabilities and will not be done when running in the server'
      );
    });
  });
});
