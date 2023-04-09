import createSdk from '../src/index';
import { authInfo } from './mocks';
import { createMockReturnValue } from './testUtils';

const mockFetch = jest.fn().mockReturnValueOnce(new Promise(() => {}));
global.fetch = mockFetch;

describe('autoRefresh', () => {
  it('should refresh token after interval', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

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
  });

  it('should not auto refresh when disabled (default value)', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

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
  });
});
