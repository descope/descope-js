import plugin, { routeGuard } from '../src/plugin';
import createSdk from '@descope/web-js-sdk';
jest.mock('@descope/web-js-sdk');

const mockCreateSdk = createSdk as jest.Mock;
const mockSdk = {
  onSessionTokenChange: jest.fn(),
  onUserChange: jest.fn(),
  refresh: jest.fn(),
  me: jest.fn(),
};
mockCreateSdk.mockReturnValue(mockSdk);

describe('plugin', () => {
  it('should create sdk instance with the correct config', () => {
    const provide = jest.fn();
    const app = { provide } as any;
    const options = {
      projectId: 'pid',
      baseUrl: 'burl',
      sessionTokenViaCookie: false,
    };

    plugin.install(app, options);

    expect(createSdk).toHaveBeenCalledWith(
      expect.objectContaining({
        persistTokens: true,
        autoRefresh: true,
        storeLastAuthenticatedUser: true,
        ...options,
      }),
    );
  });

  it('should create sdk instance with the custom config', () => {
    const provide = jest.fn();
    const app = { provide } as any;
    const options = {
      projectId: 'pid',
      baseUrl: 'burl',
      sessionTokenViaCookie: true,
      persistTokens: false,
      storeLastAuthenticatedUser: true,
    };

    plugin.install(app, options);

    expect(createSdk).toHaveBeenCalledWith(expect.objectContaining(options));
  });

  it('should update the context when new session is received from sdk hook', () => {
    const provide = jest.fn();
    const app = { provide } as any;

    plugin.install(app, {} as any);

    const onSessionTokenChange = mockSdk.onSessionTokenChange.mock.calls[0][0];
    onSessionTokenChange('newSession');

    const { session } = provide.mock.calls[0][1];
    expect(session.session.value).toBe('newSession');
  });

  it('should update the context when new user is received from sdk hook', () => {
    const provide = jest.fn();
    const app = { provide } as any;

    plugin.install(app, {} as any);

    const onUserChange = mockSdk.onUserChange.mock.calls[0][0];
    onUserChange('newUser');

    const { user } = provide.mock.calls[0][1];
    expect(user.user.value).toBe('newUser');
  });

  it('should call refresh when fetching session', () => {
    const provide = jest.fn();
    const app = { provide } as any;

    plugin.install(app, {} as any);

    const onUserChange = mockSdk.onUserChange.mock.calls[0][0];
    onUserChange('newUser');

    const { session } = provide.mock.calls[0][1];
    session.fetchSession();

    expect(mockSdk.refresh).toHaveBeenCalledTimes(1);
  });

  it('should call me when fetching user', () => {
    const provide = jest.fn();
    const app = { provide } as any;

    plugin.install(app, {} as any);

    const onUserChange = mockSdk.onUserChange.mock.calls[0][0];
    onUserChange('newUser');

    const { user } = provide.mock.calls[0][1];
    user.fetchUser();

    expect(mockSdk.me).toHaveBeenCalledTimes(1);
  });

  it('isFetchUserWasNeverCalled should return true when fetch user was never called', () => {
    const provide = jest.fn();
    const app = { provide } as any;

    plugin.install(app, {} as any);

    const { user } = provide.mock.calls[0][1];
    expect(user.isFetchUserWasNeverCalled.value).toBe(true);
  });

  it('isFetchUserWasNeverCalled should return false when fetch user was already called', async () => {
    const provide = jest.fn();
    const app = { provide } as any;

    plugin.install(app, {} as any);

    const onUserChange = mockSdk.onUserChange.mock.calls[0][0];
    await onUserChange('newUser');

    const { user } = provide.mock.calls[0][1];
    await user.fetchUser();

    expect(user.isFetchUserWasNeverCalled.value).toBe(false);
  });

  describe('routeGuard', () => {
    it('should fetch session if not fetched already', () => {
      const provide = jest.fn();
      const app = { provide } as any;

      plugin.install(app, {} as any);

      routeGuard();

      expect(mockSdk.refresh).toBeCalledTimes(1);
    });

    it('should return true if there is a session', async () => {
      const provide = jest.fn();
      const app = { provide } as any;

      plugin.install(app, {} as any);

      const onSessionTokenChange =
        mockSdk.onSessionTokenChange.mock.calls[0][0];
      onSessionTokenChange('newSession');

      expect(await routeGuard()).toBe(true);
    });

    it('should return false if there is no session', async () => {
      const provide = jest.fn();
      const app = { provide } as any;

      plugin.install(app, {} as any);

      const onSessionTokenChange =
        mockSdk.onSessionTokenChange.mock.calls[0][0];
      onSessionTokenChange('');

      expect(await routeGuard()).toBe(false);
    });

    it('should resolve only when the session is not loading', async () => {
      const provide = jest.fn();
      const app = { provide } as any;

      let resolve;

      mockSdk.refresh.mockReturnValueOnce(
        new Promise((res) => {
          resolve = res;
        }),
      );

      plugin.install(app, {} as any);
      routeGuard();
      const isAuthenticatedPromise = routeGuard();

      const onSessionTokenChange =
        mockSdk.onSessionTokenChange.mock.calls[0][0];
      onSessionTokenChange('session');

      resolve();

      expect(await isAuthenticatedPromise).toBe(true);
    });
  });
});
