import { LOGGED_IN_INDICATOR_KEY } from '../src/enhancers/withLoggedInIndicator/constants';
import { hasLoginIndicator } from '../src/enhancers/withLoggedInIndicator/helpers';
import { setCustomStorage } from '../src/enhancers/helpers';
import createSdk from '../src/index';
import { authInfo } from './mocks';
import { createMockReturnValue } from './testUtils';

// In-memory customStorage bag that is NOT backed by window.localStorage —
// mirrors a consent-gated / sessionStorage adapter a customer might pass.
const makeBag = () => {
  const store = new Map<string, string>();
  return {
    getItem: jest.fn((k: string) => store.get(k) ?? null),
    setItem: jest.fn((k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: jest.fn((k: string) => {
      store.delete(k);
    }),
  };
};

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

  // Regression for the customStorage bug: the DSLI indicator must live in real
  // localStorage regardless of a customStorage adapter, otherwise a returning
  // user whose adapter is sessionStorage-backed is misread as a fresh device.
  describe('with customStorage', () => {
    afterEach(() => {
      setCustomStorage(undefined);
    });

    it('writes DSLI to real localStorage, not to the customStorage bag', async () => {
      const bag = makeBag();
      const fetchMock = jest
        .fn()
        .mockReturnValue(createMockReturnValue(authInfo));
      global.fetch = fetchMock;

      const sdk = createSdk({ projectId: 'pid', customStorage: bag });
      await sdk.httpClient.get('1/2/3');
      await new Promise(process.nextTick);

      expect(localStorage.getItem(LOGGED_IN_INDICATOR_KEY)).toEqual(
        String(authInfo.sessionExpiration),
      );
      expect(bag.setItem).not.toHaveBeenCalledWith(
        LOGGED_IN_INDICATOR_KEY,
        expect.anything(),
      );
    });

    it('reads DSLI from real localStorage even when customStorage is set', () => {
      const bag = makeBag();
      createSdk({ projectId: 'pid', customStorage: bag }); // installs the singleton
      localStorage.setItem(LOGGED_IN_INDICATOR_KEY, '1');
      expect(hasLoginIndicator()).toBe(true);
    });

    it('does not read DSLI from the customStorage bag', () => {
      const bag = makeBag();
      bag.setItem(LOGGED_IN_INDICATOR_KEY, '1'); // only in the bag, not real localStorage
      createSdk({ projectId: 'pid', customStorage: bag });
      expect(hasLoginIndicator()).toBe(false);
    });
  });
});
