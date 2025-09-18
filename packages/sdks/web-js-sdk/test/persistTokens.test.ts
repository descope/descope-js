import Cookies from 'js-cookie';
import {
  getIdToken,
  getSessionToken,
} from '../src/enhancers/withPersistTokens/helpers';
import createSdk from '../src/index';
import { authInfo, oidcAuthInfo } from './mocks';
import { createMockReturnValue } from './testUtils';

globalThis.Headers = class Headers {
  constructor(obj: object) {
    return Object.assign({}, obj);
  }
} as any;

const descopeHeaders = {
  'x-descope-sdk-name': 'web-js',
  'x-descope-sdk-version': global.BUILD_VERSION,
  'x-descope-sdk-session-id': expect.any(String),
  'x-descope-project-id': 'pid',
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

    expect(mockFetch).toHaveBeenCalledWith(`https://api.descope.com/1/2/3`, {
      body: undefined,
      headers: new Headers({
        Authorization: `Bearer pid:${authInfo.refreshJwt}`,
        ...descopeHeaders,
      }),
      method: 'GET',
      credentials: 'include',
    });

    expect(sdk.getRefreshToken()).toEqual(authInfo.refreshJwt);
  });

  describe('set session token via cookie', () => {
    beforeEach(() => {
      delete window.location;
    });
    it('should set cookie domain when it is the same as current domain', async () => {
      window.location = { hostname: authInfo.cookieDomain } as any;

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

      expect(setMock).toHaveBeenCalledWith('DS', authInfo.sessionJwt, {
        path: authInfo.cookiePath,
        domain: authInfo.cookieDomain,
        expires: new Date(authInfo.cookieExpiration * 1000),
        sameSite: 'Strict',
        secure: true,
      });
      expect(localStorage.getItem('DSR')).toEqual(authInfo.refreshJwt);
    });

    it('should set cookie SameSite Lax when it is configured', async () => {
      window.location = { hostname: authInfo.cookieDomain } as any;

      const mockFetch = jest
        .fn()
        .mockReturnValue(createMockReturnValue(authInfo));
      global.fetch = mockFetch;

      const setMock = jest.spyOn(Cookies, 'set');

      const sdk = createSdk({
        projectId: 'pid',
        sessionTokenViaCookie: { sameSite: 'Lax' },
        persistTokens: true,
      });
      await sdk.httpClient.get('1/2/3');

      await new Promise(process.nextTick);

      expect(setMock).toHaveBeenCalledWith('DS', authInfo.sessionJwt, {
        path: authInfo.cookiePath,
        domain: authInfo.cookieDomain,
        expires: new Date(authInfo.cookieExpiration * 1000),
        sameSite: 'Lax',
        secure: true,
      });
      expect(localStorage.getItem('DSR')).toEqual(authInfo.refreshJwt);
    });

    it('should set cookie secure as false it is configured to', async () => {
      window.location = { hostname: authInfo.cookieDomain } as any;

      const mockFetch = jest
        .fn()
        .mockReturnValue(createMockReturnValue(authInfo));
      global.fetch = mockFetch;

      const setMock = jest.spyOn(Cookies, 'set');

      const sdk = createSdk({
        projectId: 'pid',
        sessionTokenViaCookie: { secure: false },
        persistTokens: true,
      });
      await sdk.httpClient.get('1/2/3');

      await new Promise(process.nextTick);

      expect(setMock).toHaveBeenCalledWith('DS', authInfo.sessionJwt, {
        path: authInfo.cookiePath,
        domain: authInfo.cookieDomain,
        expires: new Date(authInfo.cookieExpiration * 1000),
        sameSite: 'Strict',
        secure: false,
      });
      expect(localStorage.getItem('DSR')).toEqual(authInfo.refreshJwt);
    });

    it('should set cookie to both SameSite Lax and secure as false when they are configured', async () => {
      window.location = { hostname: authInfo.cookieDomain } as any;

      const mockFetch = jest
        .fn()
        .mockReturnValue(createMockReturnValue(authInfo));
      global.fetch = mockFetch;

      const setMock = jest.spyOn(Cookies, 'set');

      const sdk = createSdk({
        projectId: 'pid',
        sessionTokenViaCookie: { sameSite: 'Lax', secure: false },
        persistTokens: true,
      });
      await sdk.httpClient.get('1/2/3');

      await new Promise(process.nextTick);

      expect(setMock).toHaveBeenCalledWith('DS', authInfo.sessionJwt, {
        path: authInfo.cookiePath,
        domain: authInfo.cookieDomain,
        expires: new Date(authInfo.cookieExpiration * 1000),
        sameSite: 'Lax',
        secure: false,
      });
      expect(localStorage.getItem('DSR')).toEqual(authInfo.refreshJwt);
    });

    it('should set cookie domain when it is the a parent of cookie domain', async () => {
      window.location = { hostname: `app.${authInfo.cookieDomain}` } as any;

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

      expect(setMock).toHaveBeenCalledWith('DS', authInfo.sessionJwt, {
        path: authInfo.cookiePath,
        domain: authInfo.cookieDomain,
        expires: new Date(authInfo.cookieExpiration * 1000),
        sameSite: 'Strict',
        secure: true,
      });
    });

    it('should not set cookie domain when it does not match parent of cookie domain', async () => {
      window.location = { hostname: `another.com` } as any;

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

      expect(setMock).toHaveBeenCalledWith('DS', authInfo.sessionJwt, {
        path: authInfo.cookiePath,
        // domain is undefined
        expires: new Date(authInfo.cookieExpiration * 1000),
        sameSite: 'Strict',
        secure: true,
      });
    });

    it('should set cookie with custom cookieName when configured', async () => {
      window.location = { hostname: authInfo.cookieDomain } as any;

      const mockFetch = jest
        .fn()
        .mockReturnValue(createMockReturnValue(authInfo));
      global.fetch = mockFetch;

      const setMock = jest.spyOn(Cookies, 'set');

      const sdk = createSdk({
        projectId: 'pid',
        sessionTokenViaCookie: { cookieName: 'CUSTOM_DS' },
        persistTokens: true,
      });
      await sdk.httpClient.get('1/2/3');

      await new Promise(process.nextTick);

      expect(setMock).toHaveBeenCalledWith('CUSTOM_DS', authInfo.sessionJwt, {
        path: authInfo.cookiePath,
        domain: authInfo.cookieDomain,
        expires: new Date(authInfo.cookieExpiration * 1000),
        sameSite: 'Strict',
        secure: true,
      });
      expect(localStorage.getItem('DSR')).toEqual(authInfo.refreshJwt);
    });
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
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('should not set refresh if persistTokens is configured to false with prefix', async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(authInfo));
    global.fetch = mockFetch;

    const sdk = createSdk({
      projectId: 'pid',
      autoRefresh: false,
      persistTokens: true,
      storagePrefix: 'test.',
    });
    const refreshSpy = jest
      .spyOn(sdk, 'refresh')
      .mockReturnValue(new Promise(() => {}));
    await sdk.httpClient.get('1/2/3');

    await new Promise(process.nextTick);

    expect(localStorage.getItem('test.DSR')).toBeTruthy();
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('should not set storage if persistTokens is configured to false', async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(authInfo));
    global.fetch = mockFetch;

    const sdk = createSdk({ projectId: 'pid', persistTokens: false });
    await sdk.httpClient.get('1/2/3');

    const setMock = Cookies.set as jest.Mock;
    expect(setMock).not.toHaveBeenCalled();
  });

  it('should set cookie domain when it is the same as current domain', async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(oidcAuthInfo));
    global.fetch = mockFetch;

    const sdk = createSdk({
      projectId: 'pid',
      persistTokens: true,
    });
    await sdk.httpClient.get('1/2/3');

    await new Promise(process.nextTick);

    expect(localStorage.getItem('DSI')).toEqual(oidcAuthInfo.id_token);
  });

  describe('getSessionToken', () => {
    it('should get session from from cookie', async () => {
      const getMock = Cookies.get as jest.Mock;
      getMock.mockReturnValue('session-1');
      expect(getSessionToken('test')).toEqual('session-1');
      expect(getMock).toHaveBeenCalledWith('DS');
    });

    it('should get session with custom cookie name from from cookie', async () => {
      const getMock = Cookies.get as jest.Mock;
      getMock.mockReturnValue('session-1');
      expect(getSessionToken('test', { cookieName: 'example' })).toEqual(
        'session-1',
      );
      expect(getMock).toHaveBeenCalledWith('example');
    });

    it('should get session from from local storage', async () => {
      const getMock = Cookies.get as jest.Mock;
      getMock.mockReturnValue('');
      localStorage.setItem('test.DS', 'session-1');

      expect(getSessionToken('test.')).toEqual('session-1');
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
      localStorage.setItem('DSI', 'id-token-1');
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
      expect(localStorage.getItem('DSI')).toBeFalsy();
      const removeMock = Cookies.remove as jest.Mock;
      expect(removeMock).toHaveBeenCalledWith('DS');
    });

    it('should clear tokens on logout even when not passing refresh token', async () => {
      localStorage.setItem('DSR', authInfo.refreshJwt);
      const mockFetch = jest.fn().mockReturnValue(createMockReturnValue({}));
      global.fetch = mockFetch;

      const sdk = createSdk({ projectId: 'pid', persistTokens: true });
      await sdk.logout();

      expect(localStorage.getItem('DSR')).toBeFalsy();
      const removeMock = Cookies.remove as jest.Mock;
      expect(removeMock).toHaveBeenCalledWith('DS');
    });

    it('should clear tokens on logoutAll even when not passing refresh token', async () => {
      localStorage.setItem('DSR', authInfo.refreshJwt);
      const mockFetch = jest.fn().mockReturnValue(createMockReturnValue({}));
      global.fetch = mockFetch;

      const sdk = createSdk({ projectId: 'pid', persistTokens: true });
      await sdk.logoutAll();

      expect(localStorage.getItem('DSR')).toBeFalsy();
      const removeMock = Cookies.remove as jest.Mock;
      expect(removeMock).toHaveBeenCalledWith('DS');
    });

    it('should not log a warning when not running in the browser', () => {
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

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('getIdToken', () => {
    it('should get session from from local storage', async () => {
      localStorage.setItem('DSI', 'id-token-1');

      expect(getIdToken()).toEqual('id-token-1');
    });
  });
});
