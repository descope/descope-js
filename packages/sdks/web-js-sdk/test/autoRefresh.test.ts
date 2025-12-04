import createSdk from '../src/index';
import { authInfo } from './mocks';
import { createMockReturnValue, getFutureSessionToken } from './testUtils';
import logger from '../src/enhancers/helpers/logger';
import { MAX_TIMEOUT } from '../src/constants';
import { jwtDecode } from 'jwt-decode';

jest.mock('../src/enhancers/helpers/logger', () => ({
  debug: jest.fn(),
}));

jest.mock('jwt-decode', () => {
  return {
    jwtDecode: jest.fn(),
  };
});

const mockFetch = jest.fn().mockReturnValueOnce(new Promise(() => {}));
global.fetch = mockFetch;

describe('autoRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtDecode as jest.Mock).mockImplementation(
      jest.requireActual('jwt-decode').jwtDecode,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should refresh token after interval when only session expiration was returned', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const loggerDebugMock = logger.debug as jest.Mock;

    const sessionExpiration = Math.floor(Date.now() / 1000) + 10 * 60; // 10 minutes from now
    const mockFetch = jest.fn().mockReturnValue(
      createMockReturnValue({
        ...authInfo,
        sessionJwt: undefined,
        sessionExpiration,
      }),
    );
    global.fetch = mockFetch;

    const sdk = createSdk({ projectId: 'pid', autoRefresh: true });
    const refreshSpy = jest
      .spyOn(sdk, 'refresh')
      .mockReturnValue(new Promise(() => {}));
    await sdk.httpClient.get('1/2/3');

    // ensure logger called
    expect(loggerDebugMock).toHaveBeenCalledWith(
      expect.stringMatching(/^Setting refresh timer for/),
    );
    loggerDebugMock.mockClear();

    await new Promise(process.nextTick);

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    const timeoutFn = setTimeoutSpy.mock.calls[0][0];
    const timeoutTimer = setTimeoutSpy.mock.calls[0][1];

    // ensure refresh called with refresh token
    timeoutFn();
    expect(refreshSpy).toHaveBeenCalledWith(authInfo.refreshJwt);

    // check refresh called around 20 seconds before session token expiration
    const expectedTimer =
      (sessionExpiration - 20) * 1000 - new Date().getTime();
    expect(timeoutTimer).toBeGreaterThan(expectedTimer - 1000);
    expect(timeoutTimer).toBeLessThan(expectedTimer + 1000);

    // apply another mock and ensure timeout is being triggered
    await sdk.httpClient.get('1/2/3');

    await new Promise(process.nextTick);

    expect(clearTimeoutSpy).toHaveBeenCalled();

    expect(loggerDebugMock).toHaveBeenCalledTimes(2);
    expect(loggerDebugMock).toHaveBeenCalledWith(
      expect.stringMatching('Refreshing session'),
    );
    expect(loggerDebugMock).toHaveBeenCalledWith(
      expect.stringMatching(/^Setting refresh timer for/),
    );
  });

  it('should not refresh token after interval when the session expiration is too close', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const loggerDebugMock = logger.debug as jest.Mock;

    const sessionExpiration = Math.floor(Date.now() / 1000) + 10; // 10 seconds from now
    const mockFetch = jest.fn().mockReturnValue(
      createMockReturnValue({
        ...authInfo,
        sessionJwt: undefined,
        sessionExpiration,
      }),
    );
    global.fetch = mockFetch;

    const sdk = createSdk({ projectId: 'pid', autoRefresh: true });
    const refreshSpy = jest
      .spyOn(sdk, 'refresh')
      .mockReturnValue(new Promise(() => {}));
    await sdk.httpClient.get('1/2/3');

    // ensure logger called
    expect(loggerDebugMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/^Setting refresh timer for/),
    );
    loggerDebugMock.mockClear();

    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  it('should refresh token after interval if only sessionToken was returned', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const loggerDebugMock = logger.debug as jest.Mock;

    const sessionExpiration = Math.floor(Date.now() / 1000) + 10 * 60; // 10 minutes from now
    const sessionJwt = getFutureSessionToken(10 * 60);
    const mockFetch = jest.fn().mockReturnValue(
      createMockReturnValue({
        ...authInfo,
        sessionExpiration: undefined,
        sessionJwt,
      }),
    );
    global.fetch = mockFetch;

    const sdk = createSdk({ projectId: 'pid', autoRefresh: true });
    const refreshSpy = jest
      .spyOn(sdk, 'refresh')
      .mockReturnValue(new Promise(() => {}));
    await sdk.httpClient.get('1/2/3');

    // ensure logger called
    expect(loggerDebugMock).toHaveBeenCalledWith(
      expect.stringMatching(/^Setting refresh timer for/),
    );
    loggerDebugMock.mockClear();

    await new Promise(process.nextTick);

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    const timeoutFn = setTimeoutSpy.mock.calls[0][0];
    const timeoutTimer = setTimeoutSpy.mock.calls[0][1];

    // ensure refresh called with refresh token
    timeoutFn();
    expect(refreshSpy).toHaveBeenCalledWith(authInfo.refreshJwt);

    // check refresh called around 20 seconds before session token expiration
    const expectedTimer =
      (sessionExpiration - 20) * 1000 - new Date().getTime();
    expect(timeoutTimer).toBeGreaterThan(expectedTimer - 1000);
    expect(timeoutTimer).toBeLessThan(expectedTimer + 1000);

    // apply another mock and ensure timeout is being triggered
    await sdk.httpClient.get('1/2/3');

    await new Promise(process.nextTick);

    expect(clearTimeoutSpy).toHaveBeenCalled();

    expect(loggerDebugMock).toHaveBeenCalledTimes(3);
    expect(loggerDebugMock).toHaveBeenCalledWith(
      expect.stringMatching('Refreshing session'),
    );
    expect(loggerDebugMock).toHaveBeenCalledWith(
      expect.stringMatching(/^Setting refresh timer for/),
    );
  });

  it('should refresh token with token from storage', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    const sessionExpiration = Math.floor(Date.now() / 1000) + 10 * 60; // 10 minutes from now

    const mockFetch = jest.fn().mockReturnValue(
      createMockReturnValue({
        ...authInfo,
        sessionExpiration,
      }),
    );
    global.fetch = mockFetch;

    const sdk = createSdk({
      projectId: 'pid',
      autoRefresh: true,
      persistTokens: true,
    });
    await sdk.httpClient.get('1/2/3');

    await new Promise(process.nextTick);

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    const timeoutFn = setTimeoutSpy.mock.calls[0][0];

    // set localStorage to a certain DSR (refresh token) value
    localStorage.setItem('DSR', 'refresh-token-1');

    // ensure refresh called with refresh token from storage
    timeoutFn();

    // get last call and ensure it has the correct Authorization header
    const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
    expect(lastCall).toBeTruthy();

    const lastCallOptions = lastCall[1];
    expect(lastCallOptions).toBeTruthy();

    const headers = lastCallOptions.headers;
    expect(headers).toBeTruthy();

    const authorization = headers.get('Authorization');
    expect(authorization).toBe('Bearer pid:refresh-token-1');
  });

  it('should clear timer when receive 401', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const loggerDebugMock = logger.debug as jest.Mock;

    const unauthMock = {
      clone: () => unauthMock,
      status: 401,
      text: () => Promise.resolve(JSON.stringify(unauthMock)),
      url: new URL('http://example.com'),
      headers: new Headers(),
    };

    const mockFetch = jest.fn().mockReturnValue(unauthMock);
    global.fetch = mockFetch;

    const sdk = createSdk({ projectId: 'pid', autoRefresh: true });
    await sdk.httpClient.get('1/2/3');

    expect(setTimeoutSpy).not.toHaveBeenCalled();
    // ensure logger
    expect(loggerDebugMock).toHaveBeenCalledWith(
      expect.stringMatching('Received 401, canceling all timers'),
    );
  });

  it('should not auto refresh when disabled (default value)', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const loggerDebugMock = logger.debug as jest.Mock;

    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(authInfo));
    global.fetch = mockFetch;

    const sdk = createSdk({ projectId: 'pid' });
    const refreshSpy = jest
      .spyOn(sdk, 'refresh')
      .mockReturnValue(new Promise(() => {}));
    await sdk.httpClient.get('1/2/3');

    await new Promise(process.nextTick);

    expect(setTimeoutSpy).not.toHaveBeenCalled();
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(loggerDebugMock).not.toHaveBeenCalled();
  });

  it('should not auto refresh when descopeBridge is set on window', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const loggerDebugMock = logger.debug as jest.Mock;
    const origWindow = window;

    // mock window object
    Object.defineProperty(global, 'window', {
      writable: true,
      configurable: true,
      value: {
        descopeBridge: {},
      },
    });

    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(authInfo));
    global.fetch = mockFetch;

    const sdk = createSdk({ projectId: 'pid', autoRefresh: true });
    global.window = origWindow;
    const refreshSpy = jest
      .spyOn(sdk, 'refresh')
      .mockReturnValue(new Promise(() => {}));
    await sdk.httpClient.get('1/2/3');

    await new Promise(process.nextTick);

    expect(setTimeoutSpy).not.toHaveBeenCalled();
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(loggerDebugMock).not.toHaveBeenCalled();
  });

  it('should not refresh token when visibilitychange event and there is no session', async () => {
    const loggerDebugMock = logger.debug as jest.Mock;

    const sdk = createSdk({ projectId: 'pid', autoRefresh: true });
    const refreshSpy = jest
      .spyOn(sdk, 'refresh')
      .mockReturnValue(new Promise(() => {}));

    await new Promise(process.nextTick);

    // trigger visibilitychange event and ensure refresh called
    const event = new Event('visibilitychange');
    document.dispatchEvent(event);
    expect(refreshSpy).not.toHaveBeenCalled();

    expect(loggerDebugMock).not.toHaveBeenCalledWith(
      'Expiration time passed, refreshing session',
    );
  });

  it('should refresh token when visibilitychange event and session expired', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const loggerDebugMock = logger.debug as jest.Mock;

    const sessionExpiration = Math.floor(Date.now() / 1000) - 10 * 60; // 10 minutes ago now
    const mockFetch = jest.fn().mockReturnValue(
      createMockReturnValue({
        ...authInfo,
        sessionExpiration,
      }),
    );
    global.fetch = mockFetch;

    const sdk = createSdk({
      projectId: 'pid',
      autoRefresh: true,
    });
    const refreshSpy = jest
      .spyOn(sdk, 'refresh')
      .mockReturnValue(new Promise(() => {}));
    await sdk.httpClient.get('1/2/3');

    await new Promise(process.nextTick);

    // trigger visibilitychange event and ensure refresh called
    const event = new Event('visibilitychange');
    document.dispatchEvent(event);
    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(refreshSpy).toHaveBeenCalledWith(authInfo.refreshJwt);

    expect(loggerDebugMock).toHaveBeenCalledWith(
      'Session expired or close to expiration, refreshing session',
    );
    loggerDebugMock.mockClear();
  });

  it('should handle a case where jwt decoding fail', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const loggerDebugMock = logger.debug as jest.Mock;

    const mockFetch = jest
      .fn()
      .mockReturnValue(
        createMockReturnValue({ ...authInfo, sessionExpiration: undefined }),
      );
    global.fetch = mockFetch;

    const sdk = createSdk({ projectId: 'pid', autoRefresh: true });
    const refreshSpy = jest
      .spyOn(sdk, 'refresh')
      .mockReturnValue(new Promise(() => {}));

    // mock 'jwt-decode' to throw an error
    (jwtDecode as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Invalid token');
    });

    await sdk.httpClient.get('1/2/3');

    // ensure logger called
    expect(loggerDebugMock).toHaveBeenCalledWith(
      expect.stringMatching(
        /^Could not extract expiration time from session token/,
      ),
    );
    // ensure refresh not called
    expect(refreshSpy).not.toBeCalled();

    // ensure setTimeout is not called
    expect(setTimeoutSpy).not.toBeCalled();
  });

  it('should refresh token when visibilitychange event and session is not expired', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    const mockFetch = jest.fn().mockReturnValue(
      createMockReturnValue({
        ...authInfo,
        sessionExpiration: undefined,
        sessionJwt: getFutureSessionToken(),
      }),
    );
    global.fetch = mockFetch;

    const sdk = createSdk({ projectId: 'pid', autoRefresh: true });
    const refreshSpy = jest
      .spyOn(sdk, 'refresh')
      .mockReturnValue(new Promise(() => {}));
    await sdk.httpClient.get('1/2/3');

    await new Promise(process.nextTick);

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);

    // trigger visibilitychange event and ensure refresh called
    const event = new Event('visibilitychange');
    document.dispatchEvent(event);
    expect(refreshSpy).not.toBeCalled();
  });

  it('should refresh token with max timeout if session token is too large', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const loggerDebugMock = logger.debug as jest.Mock;

    const authInfoWith1MonthExpiration = {
      ...authInfo,
      sessionExpiration: undefined,
      sessionJwt: getFutureSessionToken(30 * 24 * 60 * 60 * 1000),
    };
    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(authInfoWith1MonthExpiration));
    global.fetch = mockFetch;

    const sdk = createSdk({ projectId: 'pid', autoRefresh: true });
    await sdk.httpClient.get('1/2/3');

    const timeoutTimer = setTimeoutSpy.mock.calls[0][1];
    expect(timeoutTimer).toBe(MAX_TIMEOUT);
    // ensure logger called
    expect(loggerDebugMock).toHaveBeenCalledWith(
      expect.stringMatching(/^Timeout is too large/),
    );
    expect(loggerDebugMock).toHaveBeenCalledWith(
      expect.stringMatching(/^Setting refresh timer for/),
    );
    loggerDebugMock.mockClear();
  });
});
