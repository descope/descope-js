import Cookies from 'js-cookie';
import {
  getIdToken,
  getSessionToken,
  getRefreshToken,
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

    it('should set cookie with custom domain when configured', async () => {
      window.location = { hostname: 'app.custom.example.com' } as any;

      const mockFetch = jest
        .fn()
        .mockReturnValue(createMockReturnValue(authInfo));
      global.fetch = mockFetch;

      const setMock = jest.spyOn(Cookies, 'set');

      const sdk = createSdk({
        projectId: 'pid',
        sessionTokenViaCookie: { domain: 'custom.example.com' },
        persistTokens: true,
      });
      await sdk.httpClient.get('1/2/3');

      await new Promise(process.nextTick);

      expect(setMock).toHaveBeenCalledWith('DS', authInfo.sessionJwt, {
        path: authInfo.cookiePath,
        domain: 'custom.example.com',
        expires: new Date(authInfo.cookieExpiration * 1000),
        sameSite: 'Strict',
        secure: true,
      });
      expect(localStorage.getItem('DSR')).toEqual(authInfo.refreshJwt);
    });
  });

  describe('set refresh token via cookie', () => {
    beforeEach(() => {
      delete window.location;
    });

    it('should set refresh token cookie when refreshTokenViaCookie is true', async () => {
      window.location = { hostname: authInfo.cookieDomain } as any;

      const mockFetch = jest
        .fn()
        .mockReturnValue(createMockReturnValue(authInfo));
      global.fetch = mockFetch;

      const setMock = jest.spyOn(Cookies, 'set');

      const sdk = createSdk({
        projectId: 'pid',
        refreshTokenViaCookie: true,
        persistTokens: true,
      });
      await sdk.httpClient.get('1/2/3');

      await new Promise(process.nextTick);

      expect(setMock).toHaveBeenCalledWith('DSR', authInfo.refreshJwt, {
        path: authInfo.cookiePath,
        domain: authInfo.cookieDomain,
        expires: new Date(authInfo.cookieExpiration * 1000),
        sameSite: 'Strict',
        secure: true,
      });
      expect(localStorage.getItem('DSR')).toBeFalsy();
      expect(localStorage.getItem('DS')).toEqual(authInfo.sessionJwt);
    });

    it('should set refresh cookie SameSite Lax when configured', async () => {
      window.location = { hostname: authInfo.cookieDomain } as any;

      const mockFetch = jest
        .fn()
        .mockReturnValue(createMockReturnValue(authInfo));
      global.fetch = mockFetch;

      const setMock = jest.spyOn(Cookies, 'set');

      const sdk = createSdk({
        projectId: 'pid',
        refreshTokenViaCookie: { sameSite: 'Lax' },
        persistTokens: true,
      });
      await sdk.httpClient.get('1/2/3');

      await new Promise(process.nextTick);

      expect(setMock).toHaveBeenCalledWith('DSR', authInfo.refreshJwt, {
        path: authInfo.cookiePath,
        domain: authInfo.cookieDomain,
        expires: new Date(authInfo.cookieExpiration * 1000),
        sameSite: 'Lax',
        secure: true,
      });
      expect(localStorage.getItem('DSR')).toBeFalsy();
    });

    it('should set refresh cookie secure as false when configured', async () => {
      window.location = { hostname: authInfo.cookieDomain } as any;

      const mockFetch = jest
        .fn()
        .mockReturnValue(createMockReturnValue(authInfo));
      global.fetch = mockFetch;

      const setMock = jest.spyOn(Cookies, 'set');

      const sdk = createSdk({
        projectId: 'pid',
        refreshTokenViaCookie: { secure: false },
        persistTokens: true,
      });
      await sdk.httpClient.get('1/2/3');

      await new Promise(process.nextTick);

      expect(setMock).toHaveBeenCalledWith('DSR', authInfo.refreshJwt, {
        path: authInfo.cookiePath,
        domain: authInfo.cookieDomain,
        expires: new Date(authInfo.cookieExpiration * 1000),
        sameSite: 'Strict',
        secure: false,
      });
      expect(localStorage.getItem('DSR')).toBeFalsy();
    });

    it('should set refresh cookie to both SameSite Lax and secure as false when configured', async () => {
      window.location = { hostname: authInfo.cookieDomain } as any;

      const mockFetch = jest
        .fn()
        .mockReturnValue(createMockReturnValue(authInfo));
      global.fetch = mockFetch;

      const setMock = jest.spyOn(Cookies, 'set');

      const sdk = createSdk({
        projectId: 'pid',
        refreshTokenViaCookie: { sameSite: 'Lax', secure: false },
        persistTokens: true,
      });
      await sdk.httpClient.get('1/2/3');

      await new Promise(process.nextTick);

      expect(setMock).toHaveBeenCalledWith('DSR', authInfo.refreshJwt, {
        path: authInfo.cookiePath,
        domain: authInfo.cookieDomain,
        expires: new Date(authInfo.cookieExpiration * 1000),
        sameSite: 'Lax',
        secure: false,
      });
      expect(localStorage.getItem('DSR')).toBeFalsy();
    });

    it('should set refresh cookie domain when it is a parent of cookie domain', async () => {
      window.location = { hostname: `app.${authInfo.cookieDomain}` } as any;

      const mockFetch = jest
        .fn()
        .mockReturnValue(createMockReturnValue(authInfo));
      global.fetch = mockFetch;

      const setMock = jest.spyOn(Cookies, 'set');

      const sdk = createSdk({
        projectId: 'pid',
        refreshTokenViaCookie: true,
        persistTokens: true,
      });
      await sdk.httpClient.get('1/2/3');

      await new Promise(process.nextTick);

      expect(setMock).toHaveBeenCalledWith('DSR', authInfo.refreshJwt, {
        path: authInfo.cookiePath,
        domain: authInfo.cookieDomain,
        expires: new Date(authInfo.cookieExpiration * 1000),
        sameSite: 'Strict',
        secure: true,
      });
    });

    it('should not set refresh cookie domain when it does not match parent of cookie domain', async () => {
      window.location = { hostname: `another.com` } as any;

      const mockFetch = jest
        .fn()
        .mockReturnValue(createMockReturnValue(authInfo));
      global.fetch = mockFetch;

      const setMock = jest.spyOn(Cookies, 'set');

      const sdk = createSdk({
        projectId: 'pid',
        refreshTokenViaCookie: true,
        persistTokens: true,
      });
      await sdk.httpClient.get('1/2/3');

      await new Promise(process.nextTick);

      expect(setMock).toHaveBeenCalledWith('DSR', authInfo.refreshJwt, {
        path: authInfo.cookiePath,
        domain: undefined,
        expires: new Date(authInfo.cookieExpiration * 1000),
        sameSite: 'Strict',
        secure: true,
      });
    });

    it('should set refresh cookie with custom cookieName when configured', async () => {
      window.location = { hostname: authInfo.cookieDomain } as any;

      const mockFetch = jest
        .fn()
        .mockReturnValue(createMockReturnValue(authInfo));
      global.fetch = mockFetch;

      const setMock = jest.spyOn(Cookies, 'set');

      const sdk = createSdk({
        projectId: 'pid',
        refreshTokenViaCookie: { cookieName: 'CUSTOM_DSR' },
        persistTokens: true,
      });
      await sdk.httpClient.get('1/2/3');

      await new Promise(process.nextTick);

      expect(setMock).toHaveBeenCalledWith('CUSTOM_DSR', authInfo.refreshJwt, {
        path: authInfo.cookiePath,
        domain: authInfo.cookieDomain,
        expires: new Date(authInfo.cookieExpiration * 1000),
        sameSite: 'Strict',
        secure: true,
      });
      expect(localStorage.getItem('DSR')).toBeFalsy();
    });

    it('should set refresh cookie with custom domain when configured', async () => {
      window.location = { hostname: 'app.custom.example.com' } as any;

      const mockFetch = jest
        .fn()
        .mockReturnValue(createMockReturnValue(authInfo));
      global.fetch = mockFetch;

      const setMock = jest.spyOn(Cookies, 'set');

      const sdk = createSdk({
        projectId: 'pid',
        refreshTokenViaCookie: { domain: 'custom.example.com' },
        persistTokens: true,
      });
      await sdk.httpClient.get('1/2/3');

      await new Promise(process.nextTick);

      expect(setMock).toHaveBeenCalledWith('DSR', authInfo.refreshJwt, {
        path: authInfo.cookiePath,
        domain: 'custom.example.com',
        expires: new Date(authInfo.cookieExpiration * 1000),
        sameSite: 'Strict',
        secure: true,
      });
      expect(localStorage.getItem('DSR')).toBeFalsy();
    });

    it('should work with both session and refresh tokens via cookie', async () => {
      window.location = { hostname: authInfo.cookieDomain } as any;

      const mockFetch = jest
        .fn()
        .mockReturnValue(createMockReturnValue(authInfo));
      global.fetch = mockFetch;

      const setMock = jest.spyOn(Cookies, 'set');

      const sdk = createSdk({
        projectId: 'pid',
        sessionTokenViaCookie: true,
        refreshTokenViaCookie: true,
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
      expect(setMock).toHaveBeenCalledWith('DSR', authInfo.refreshJwt, {
        path: authInfo.cookiePath,
        domain: authInfo.cookieDomain,
        expires: new Date(authInfo.cookieExpiration * 1000),
        sameSite: 'Strict',
        secure: true,
      });
      // Verify refresh token is not in localStorage
      expect(localStorage.getItem('DSR')).toBeFalsy();
      // Note: Session token cleanup from localStorage when switching to cookie
      // is not implemented, so we don't check it here
    });

    it('should clear localStorage refresh token when switching to cookie', async () => {
      window.location = { hostname: authInfo.cookieDomain } as any;

      // First set refresh token in localStorage
      localStorage.setItem('DSR', 'old-refresh-token');

      const mockFetch = jest
        .fn()
        .mockReturnValue(createMockReturnValue(authInfo));
      global.fetch = mockFetch;

      const setMock = jest.spyOn(Cookies, 'set');

      const sdk = createSdk({
        projectId: 'pid',
        refreshTokenViaCookie: true,
        persistTokens: true,
      });
      await sdk.httpClient.get('1/2/3');

      await new Promise(process.nextTick);

      expect(setMock).toHaveBeenCalledWith('DSR', authInfo.refreshJwt, {
        path: authInfo.cookiePath,
        domain: authInfo.cookieDomain,
        expires: new Date(authInfo.cookieExpiration * 1000),
        sameSite: 'Strict',
        secure: true,
      });
      // Verify localStorage was cleared
      expect(localStorage.getItem('DSR')).toBeFalsy();
    });

    it('should remove refresh cookie when refreshTokenViaCookie is false', async () => {
      window.location = { hostname: authInfo.cookieDomain } as any;

      const mockFetch = jest
        .fn()
        .mockReturnValue(createMockReturnValue(authInfo));
      global.fetch = mockFetch;

      const removeMock = jest.spyOn(Cookies, 'remove');

      const sdk = createSdk({
        projectId: 'pid',
        refreshTokenViaCookie: false,
        persistTokens: true,
      });
      await sdk.httpClient.get('1/2/3');

      await new Promise(process.nextTick);

      expect(removeMock).toHaveBeenCalledWith('DSR');
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
      expect(removeMock).toHaveBeenCalledWith('DS', undefined);
    });

    it('should clear tokens on logout with custom domain when configured', async () => {
      window.location = { hostname: 'app.custom.example.com' } as any;
      const mockFetch = jest
        .fn()
        .mockReturnValueOnce(createMockReturnValue(authInfo))
        .mockReturnValue(createMockReturnValue({}));
      global.fetch = mockFetch;

      const sdk = createSdk({
        projectId: 'pid',
        persistTokens: true,
        sessionTokenViaCookie: { domain: 'custom.example.com' },
      });

      // Call something to simulate auth info
      await sdk.httpClient.get('1/2/3');

      await sdk.logout(authInfo.refreshJwt);

      expect(localStorage.getItem('DSR')).toBeFalsy();
      expect(localStorage.getItem('DSI')).toBeFalsy();
      const removeMock = Cookies.remove as jest.Mock;
      // Should be called with the exact same options that were used to set the cookie
      expect(removeMock).toHaveBeenCalledWith('DS', {
        path: authInfo.cookiePath,
        domain: 'custom.example.com',
      });
    });

    it('should clear tokens on logout even when not passing refresh token', async () => {
      localStorage.setItem('DSR', authInfo.refreshJwt);
      const mockFetch = jest.fn().mockReturnValue(createMockReturnValue({}));
      global.fetch = mockFetch;

      const sdk = createSdk({ projectId: 'pid', persistTokens: true });
      await sdk.logout();

      expect(localStorage.getItem('DSR')).toBeFalsy();
      const removeMock = Cookies.remove as jest.Mock;
      expect(removeMock).toHaveBeenCalledWith('DS', undefined);
    });

    it('should clear tokens on logoutAll even when not passing refresh token', async () => {
      localStorage.setItem('DSR', authInfo.refreshJwt);
      const mockFetch = jest.fn().mockReturnValue(createMockReturnValue({}));
      global.fetch = mockFetch;

      const sdk = createSdk({ projectId: 'pid', persistTokens: true });
      await sdk.logoutAll();

      expect(localStorage.getItem('DSR')).toBeFalsy();
      const removeMock = Cookies.remove as jest.Mock;
      expect(removeMock).toHaveBeenCalledWith('DS', undefined);
    });

    it('should clear refresh token cookie on logout', async () => {
      const mockFetch = jest
        .fn()
        .mockReturnValueOnce(createMockReturnValue(authInfo))
        .mockReturnValue(createMockReturnValue({}));
      global.fetch = mockFetch;

      const removeMock = jest.spyOn(Cookies, 'remove');

      const sdk = createSdk({
        projectId: 'pid',
        persistTokens: true,
        refreshTokenViaCookie: true,
      });

      // Call something to simulate auth info
      await sdk.httpClient.get('1/2/3');

      await new Promise(process.nextTick);

      await sdk.logout();

      expect(removeMock).toHaveBeenCalledWith('DSR');
    });

    it('should clear custom refresh token cookie on logout', async () => {
      const mockFetch = jest
        .fn()
        .mockReturnValueOnce(createMockReturnValue(authInfo))
        .mockReturnValue(createMockReturnValue({}));
      global.fetch = mockFetch;

      const removeMock = jest.spyOn(Cookies, 'remove');

      const sdk = createSdk({
        projectId: 'pid',
        persistTokens: true,
        refreshTokenViaCookie: { cookieName: 'CUSTOM_REFRESH' },
      });

      // Call something to simulate auth info
      await sdk.httpClient.get('1/2/3');

      await new Promise(process.nextTick);

      await sdk.logout();

      expect(removeMock).toHaveBeenCalledWith('CUSTOM_REFRESH');
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

  describe('getRefreshToken', () => {
    it('should get refresh token from cookie', async () => {
      const getMock = Cookies.get as jest.Mock;
      getMock.mockReturnValue('refresh-1');
      expect(getRefreshToken('test')).toEqual('refresh-1');
      expect(getMock).toHaveBeenCalledWith('DSR');
    });

    it('should get refresh token with custom cookie name from cookie', async () => {
      const getMock = Cookies.get as jest.Mock;
      getMock.mockReturnValue('refresh-1');
      expect(getRefreshToken('test', { cookieName: 'CUSTOM_DSR' })).toEqual(
        'refresh-1',
      );
      expect(getMock).toHaveBeenCalledWith('CUSTOM_DSR');
    });

    it('should get refresh token from local storage when not in cookie', async () => {
      const getMock = Cookies.get as jest.Mock;
      getMock.mockReturnValue('');
      localStorage.setItem('test.DSR', 'refresh-1');

      expect(getRefreshToken('test.')).toEqual('refresh-1');
    });

    it('should prioritize cookie over localStorage', async () => {
      const getMock = Cookies.get as jest.Mock;
      getMock.mockReturnValue('refresh-from-cookie');
      localStorage.setItem('DSR', 'refresh-from-storage');

      expect(getRefreshToken()).toEqual('refresh-from-cookie');
    });
  });

  describe('getIdToken', () => {
    it('should get session from from local storage', async () => {
      localStorage.setItem('DSI', 'id-token-1');

      expect(getIdToken()).toEqual('id-token-1');
    });
  });
});
