import createSdk from '../src/index';
import { authInfo } from './mocks';
import { createMockReturnValue } from './testUtils';

const mockFetch = jest.fn().mockReturnValueOnce(new Promise(() => {}));
global.fetch = mockFetch;

describe('notifications', () => {
  it('should subscribe to onSessionTokenChange and onUserChange', async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(authInfo));
    global.fetch = mockFetch;

    const sdk = createSdk({ projectId: 'pid', autoRefresh: true });
    const sessionTokenHandler = jest.fn();
    sdk.onSessionTokenChange(sessionTokenHandler);

    const userHandler = jest.fn();
    sdk.onUserChange(userHandler);

    await sdk.httpClient.get('1/2/3');

    await new Promise((resolve: Function) =>
      setTimeout(() => {
        expect(sessionTokenHandler).toBeCalledWith(authInfo.sessionJwt);
        expect(userHandler).toBeCalledWith(authInfo.user);
        resolve();
      }, 0)
    );
  });

  it('should call to onUserChange with getMe response', async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(authInfo));
    global.fetch = mockFetch;

    const sdk = createSdk({ projectId: 'pid', autoRefresh: true });

    const userHandler = jest.fn();
    sdk.onUserChange(userHandler);

    await sdk.me();

    await new Promise((resolve: Function) =>
      setTimeout(() => {
        expect(userHandler).toBeCalledWith(authInfo.user);
        resolve();
      }, 0)
    );
  });

  it('should handle unauthenticated response', async () => {
    const unauthMock = {
      clone: () => unauthMock,
      status: 401,
      text: () => Promise.resolve(JSON.stringify(unauthMock)),
      url: new URL('http://example.com'),
      headers: new Headers(),
    };
    const mockFetch = jest
      .fn()
      .mockReturnValueOnce(Promise.resolve(createMockReturnValue(authInfo)))
      .mockReturnValueOnce(Promise.resolve(unauthMock));
    global.fetch = mockFetch;

    const sdk = createSdk({ projectId: 'pid', autoRefresh: true });

    const sessionTokenHandler = jest.fn();
    sdk.onSessionTokenChange(sessionTokenHandler);

    const userHandler = jest.fn();
    sdk.onUserChange(userHandler);

    await sdk.httpClient.get('1/2/3');

    await new Promise(process.nextTick);

    await sdk.httpClient.get('1/2/3');

    await new Promise(process.nextTick);

    expect(sessionTokenHandler).toBeCalledTimes(2);
    expect(userHandler).toBeCalledTimes(2);
    expect(sessionTokenHandler).toHaveBeenNthCalledWith(2, null);
    expect(userHandler).toHaveBeenNthCalledWith(2, null);
  });

  it('should not update state when response does not contain jwt response', async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(Promise.resolve(createMockReturnValue({})));
    global.fetch = mockFetch;

    const sdk = createSdk({ projectId: 'pid', autoRefresh: true });

    const sessionTokenHandler = jest.fn();
    sdk.onSessionTokenChange(sessionTokenHandler);

    const userHandler = jest.fn();
    sdk.onUserChange(userHandler);

    await sdk.httpClient.get('1/2/3');

    await new Promise((resolve: Function) =>
      setTimeout(() => {
        expect(sessionTokenHandler).not.toBeCalled();
        expect(userHandler).not.toBeCalled();
        resolve();
      }, 0)
    );
  });

  it('should notify empty tokens on logout', async () => {
    // mock one response with auth info, and another one for logout
    const mockFetch = jest
      .fn()
      .mockReturnValueOnce(createMockReturnValue(authInfo))
      .mockReturnValue(createMockReturnValue({}));
    global.fetch = mockFetch;

    const sessionTokenHandler = jest.fn();

    const sdk = createSdk({ projectId: 'pid' });

    // Call something to simulate auth info
    await sdk.httpClient.get('1/2/3');

    sdk.onSessionTokenChange(sessionTokenHandler);
    await sdk.logout(authInfo.refreshJwt);

    // Ensure subscriber called automatically with an empty value
    await new Promise((resolve: Function) =>
      setTimeout(() => {
        expect(sessionTokenHandler).toBeCalledWith(null);
        resolve();
      }, 0)
    );
  });
});
