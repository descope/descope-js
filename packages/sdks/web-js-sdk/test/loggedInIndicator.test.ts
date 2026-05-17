import { LOGGED_IN_INDICATOR_KEY } from '../src/enhancers/withLoggedInIndicator/constants';
import { hasLoginIndicator } from '../src/enhancers/withLoggedInIndicator/helpers';
import createSdk from '../src/index';
import { authInfo } from './mocks';
import { createMockReturnValue } from './testUtils';

const mockFetch = jest.fn().mockReturnValueOnce(new Promise(() => {}));
global.fetch = mockFetch;
Object.defineProperty(global, 'PublicKeyCredential', { value: class {} });

describe('withLoggedInIndicator', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('writes DSLI after a response containing sessionExpiration', async () => {
    const fetchMock = jest
      .fn()
      .mockReturnValue(createMockReturnValue(authInfo));
    global.fetch = fetchMock;

    const sdk = createSdk({ projectId: 'pid' });
    await sdk.httpClient.get('1/2/3');
    await new Promise(process.nextTick);

    expect(localStorage.getItem(LOGGED_IN_INDICATOR_KEY)).toEqual(
      String(authInfo.sessionExpiration),
    );
  });

  it('does not write DSLI when response has no sessionExpiration', async () => {
    const fetchMock = jest
      .fn()
      .mockReturnValue(createMockReturnValue({ someField: 'value' }));
    global.fetch = fetchMock;

    const sdk = createSdk({ projectId: 'pid' });
    await sdk.httpClient.get('1/2/3');
    await new Promise(process.nextTick);

    expect(localStorage.getItem(LOGGED_IN_INDICATOR_KEY)).toBeNull();
  });

  it('clears DSLI on logout', async () => {
    localStorage.setItem(LOGGED_IN_INDICATOR_KEY, '1');
    const fetchMock = jest.fn().mockReturnValue(createMockReturnValue({}));
    global.fetch = fetchMock;

    const sdk = createSdk({ projectId: 'pid' });
    await sdk.logout();

    expect(localStorage.getItem(LOGGED_IN_INDICATOR_KEY)).toBeNull();
  });

  it('clears DSLI on logoutAll', async () => {
    localStorage.setItem(LOGGED_IN_INDICATOR_KEY, '1');
    const fetchMock = jest.fn().mockReturnValue(createMockReturnValue({}));
    global.fetch = fetchMock;

    const sdk = createSdk({ projectId: 'pid' });
    await sdk.logoutAll();

    expect(localStorage.getItem(LOGGED_IN_INDICATOR_KEY)).toBeNull();
  });

  it('clears DSLI on 4xx /v1/auth/refresh', async () => {
    localStorage.setItem(LOGGED_IN_INDICATOR_KEY, '1');
    const failedMock = {
      clone: () => failedMock,
      ok: false,
      status: 401,
      text: () => Promise.resolve(JSON.stringify({})),
      url: new URL('http://example.com'),
      headers: new Headers(),
    };
    const fetchMock = jest.fn().mockReturnValueOnce(failedMock);
    global.fetch = fetchMock;

    const sdk = createSdk({ projectId: 'pid' });
    await sdk.httpClient.get('/v1/auth/refresh');
    await new Promise(process.nextTick);

    expect(localStorage.getItem(LOGGED_IN_INDICATOR_KEY)).toBeNull();
  });

  it('clears DSLI on 4xx /v1/auth/try-refresh', async () => {
    localStorage.setItem(LOGGED_IN_INDICATOR_KEY, '1');
    const failedMock = {
      clone: () => failedMock,
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify({})),
      url: new URL('http://example.com'),
      headers: new Headers(),
    };
    const fetchMock = jest.fn().mockReturnValueOnce(failedMock);
    global.fetch = fetchMock;

    const sdk = createSdk({ projectId: 'pid' });
    await sdk.httpClient.get('/v1/auth/try-refresh');
    await new Promise(process.nextTick);

    expect(localStorage.getItem(LOGGED_IN_INDICATOR_KEY)).toBeNull();
  });

  it('does not clear DSLI on 5xx server error from /v1/auth/refresh', async () => {
    localStorage.setItem(LOGGED_IN_INDICATOR_KEY, '1');
    const serverErrorMock = {
      clone: () => serverErrorMock,
      ok: false,
      status: 500,
      text: () => Promise.resolve(JSON.stringify({})),
      url: new URL('http://example.com'),
      headers: new Headers(),
    };
    const fetchMock = jest.fn().mockReturnValueOnce(serverErrorMock);
    global.fetch = fetchMock;

    const sdk = createSdk({ projectId: 'pid' });
    await sdk.httpClient.get('/v1/auth/refresh');
    await new Promise(process.nextTick);

    expect(localStorage.getItem(LOGGED_IN_INDICATOR_KEY)).toEqual('1');
  });

  it('does not clear DSLI on 4xx for non-session-validation routes', async () => {
    localStorage.setItem(LOGGED_IN_INDICATOR_KEY, '1');
    const failedOtpMock = {
      clone: () => failedOtpMock,
      ok: false,
      status: 401,
      text: () => Promise.resolve(JSON.stringify({})),
      url: new URL('http://example.com'),
      headers: new Headers(),
    };
    const fetchMock = jest.fn().mockReturnValueOnce(failedOtpMock);
    global.fetch = fetchMock;

    const sdk = createSdk({ projectId: 'pid' });
    await sdk.httpClient.get('/v1/auth/otp/verify');
    await new Promise(process.nextTick);

    expect(localStorage.getItem(LOGGED_IN_INDICATOR_KEY)).toEqual('1');
  });

  it('writes DSLI to a fixed key regardless of storagePrefix', async () => {
    // DSLI is intentionally unprefixed — matches the lastUser bootstrap key
    const fetchMock = jest
      .fn()
      .mockReturnValue(createMockReturnValue(authInfo));
    global.fetch = fetchMock;

    const sdk = createSdk({
      projectId: 'pid',
      storagePrefix: 'myapp.',
    });
    await sdk.httpClient.get('1/2/3');
    await new Promise(process.nextTick);

    expect(localStorage.getItem(LOGGED_IN_INDICATOR_KEY)).toEqual(
      String(authInfo.sessionExpiration),
    );
    expect(localStorage.getItem(`myapp.${LOGGED_IN_INDICATOR_KEY}`)).toBeNull();
  });

  it('writes DSLI when sessionExpiration is nested under authInfo (flow response)', async () => {
    const fetchMock = jest.fn().mockReturnValue(
      createMockReturnValue({
        authInfo,
        status: 'completed',
      }),
    );
    global.fetch = fetchMock;

    const sdk = createSdk({ projectId: 'pid' });
    await sdk.httpClient.get('1/2/3');
    await new Promise(process.nextTick);

    expect(localStorage.getItem(LOGGED_IN_INDICATOR_KEY)).toEqual(
      String(authInfo.sessionExpiration),
    );
  });

  describe('hasLoginIndicator', () => {
    beforeEach(() => {
      localStorage.removeItem('DSLI');
      localStorage.removeItem('dls_last_user_login_id');
    });

    it('returns true when DSLI is set', () => {
      localStorage.setItem('DSLI', '1');
      expect(hasLoginIndicator()).toBe(true);
    });

    it('returns true when only the lastUser bootstrap key is set', () => {
      localStorage.setItem('dls_last_user_login_id', 'someone@example.com');
      expect(hasLoginIndicator()).toBe(true);
    });

    it('returns true when both DSLI and lastUser are set', () => {
      localStorage.setItem('DSLI', '1');
      localStorage.setItem('dls_last_user_login_id', 'someone@example.com');
      expect(hasLoginIndicator()).toBe(true);
    });

    it('returns false when neither key is set', () => {
      expect(hasLoginIndicator()).toBe(false);
    });
  });
});
