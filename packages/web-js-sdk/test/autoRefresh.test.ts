import createSdk from '../src/index';
import { authInfo } from './mocks';
import { createMockReturnValue, getExpiredSessionToken } from './testUtils';
import logger from '../src/enhancers/helpers/logger';

jest.mock('../src/enhancers/helpers/logger', () => ({
  debug: jest.fn(),
}));

const mockFetch = jest.fn().mockReturnValueOnce(new Promise(() => {}));
global.fetch = mockFetch;

describe('autoRefresh', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should refresh token after interval', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const loggerDebugMock = logger.debug as jest.Mock;

    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(authInfo));
    global.fetch = mockFetch;

    const sdk = createSdk({ projectId: 'pid', autoRefresh: true });
    const refreshSpy = jest
      .spyOn(sdk, 'refresh')
      .mockReturnValue(new Promise(() => {}));
    await sdk.httpClient.get('1/2/3');

    // ensure logger called
    expect(loggerDebugMock).toHaveBeenCalledWith(
      expect.stringMatching(/^Setting refresh timer for/)
    );
    loggerDebugMock.mockClear();

    await new Promise(process.nextTick);

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    const timeoutFn = setTimeoutSpy.mock.calls[0][0];
    const timeoutTimer = setTimeoutSpy.mock.calls[0][1];

    // ensure refresh called with refresh token
    timeoutFn();
    expect(refreshSpy).toBeCalledWith(authInfo.refreshJwt);

    // check refresh called around 20 seconds before session token expiration
    const expectedTimer = 1663190448000 - new Date().getTime();
    expect(timeoutTimer).toBeGreaterThan(expectedTimer - 1000);
    expect(timeoutTimer).toBeLessThan(expectedTimer + 1000);

    // apply another mock and ensure timeout is being triggered
    await sdk.httpClient.get('1/2/3');

    await new Promise(process.nextTick);

    expect(clearTimeoutSpy).toHaveBeenCalled();

    expect(loggerDebugMock).toHaveBeenCalledTimes(2);
    expect(loggerDebugMock).toHaveBeenCalledWith(
      expect.stringMatching('Refreshing session')
    );
    expect(loggerDebugMock).toHaveBeenCalledWith(
      expect.stringMatching(/^Setting refresh timer for/)
    );
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
      expect.stringMatching('Received 401, canceling all timers')
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

  it('should refresh token when visibilitychange event and session expired', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const loggerDebugMock = logger.debug as jest.Mock;

    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(authInfo));
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
    expect(refreshSpy).toBeCalledWith(authInfo.refreshJwt);

    expect(loggerDebugMock).toHaveBeenCalledWith(
      'Expiration time passed, refreshing session'
    );
  });

  it('should refresh token when visibilitychange event and session is not expired', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    const mockFetch = jest.fn().mockReturnValue(
      createMockReturnValue({
        ...authInfo,
        sessionJwt: getExpiredSessionToken(),
      })
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
});
