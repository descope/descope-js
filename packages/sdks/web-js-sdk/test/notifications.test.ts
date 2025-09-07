import createSdk from '../src/index';
import { authInfo } from './mocks';
import { createMockReturnValue } from './testUtils';

const mockFetch = jest.fn().mockReturnValueOnce(new Promise(() => {}));
global.fetch = mockFetch;

describe('notifications', () => {
  it('should subscribe to onSessionTokenChange, onIsAuthenticatedChange, onUserChange and onClaimsChange', async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(createMockReturnValue(authInfo));
    global.fetch = mockFetch;

    const sdk = createSdk({ projectId: 'pid', autoRefresh: true });
    const sessionTokenHandler = jest.fn();
    sdk.onSessionTokenChange(sessionTokenHandler);

    const userHandler = jest.fn();
    sdk.onUserChange(userHandler);

    const claimsHandler = jest.fn();
    sdk.onClaimsChange(claimsHandler);

    const isAuthenticatedHandler = jest.fn();
    sdk.onIsAuthenticatedChange(isAuthenticatedHandler);

    await sdk.httpClient.get('1/2/3');

    await new Promise((resolve: Function) =>
      setTimeout(() => {
        expect(sessionTokenHandler).toHaveBeenCalledWith(authInfo.sessionJwt);
        expect(userHandler).toHaveBeenCalledWith(authInfo.user);
        expect(claimsHandler).toHaveBeenCalledWith(authInfo.claims);
        expect(isAuthenticatedHandler).toHaveBeenCalledWith(true);
        resolve();
      }, 0),
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
      }, 0),
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

    const claimsHandler = jest.fn();
    sdk.onClaimsChange(claimsHandler);

    const isAuthenticatedHandler = jest.fn();
    sdk.onIsAuthenticatedChange(isAuthenticatedHandler);

    await sdk.httpClient.get('1/2/3');

    await new Promise(process.nextTick);

    await sdk.httpClient.get('1/2/3');

    await new Promise(process.nextTick);

    expect(sessionTokenHandler).toHaveBeenCalledTimes(2);
    expect(userHandler).toHaveBeenCalledTimes(2);
    expect(claimsHandler).toHaveBeenCalledTimes(2);
    expect(isAuthenticatedHandler).toHaveBeenCalledTimes(2);
    expect(sessionTokenHandler).toHaveBeenNthCalledWith(2, null);
    expect(userHandler).toHaveBeenNthCalledWith(2, null);
    expect(claimsHandler).toHaveBeenNthCalledWith(2, null);
    expect(isAuthenticatedHandler).toHaveBeenNthCalledWith(2, false);
  });

  it('should not update state when response does not contain jwt response', async () => {
    const mockFetch = jest
      .fn()
      .mockReturnValue(Promise.resolve(createMockReturnValue({})));
    global.fetch = mockFetch;

    const sdk = createSdk({ projectId: 'pid', autoRefresh: true });

    const sessionTokenHandler = jest.fn();
    sdk.onSessionTokenChange(sessionTokenHandler);

    const isAuthenticatedHandler = jest.fn();
    sdk.onIsAuthenticatedChange(isAuthenticatedHandler);

    const userHandler = jest.fn();
    sdk.onUserChange(userHandler);

    await sdk.httpClient.get('1/2/3');

    await new Promise((resolve: Function) =>
      setTimeout(() => {
        expect(sessionTokenHandler).not.toHaveBeenCalled();
        expect(userHandler).not.toHaveBeenCalled();
        expect(isAuthenticatedHandler).not.toHaveBeenCalled();
        resolve();
      }, 0),
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
    const isAuthenticatedHandler = jest.fn();

    const sdk = createSdk({ projectId: 'pid' });

    // Call something to simulate auth info
    await sdk.httpClient.get('1/2/3');

    sdk.onSessionTokenChange(sessionTokenHandler);
    sdk.onIsAuthenticatedChange(isAuthenticatedHandler);

    await sdk.logout(authInfo.refreshJwt);

    // Ensure subscriber called automatically with an empty value
    await new Promise((resolve: Function) =>
      setTimeout(() => {
        expect(sessionTokenHandler).toHaveBeenCalledWith(null);
        expect(isAuthenticatedHandler).toHaveBeenCalledWith(false);
        resolve();
      }, 0),
    );
  });
});
