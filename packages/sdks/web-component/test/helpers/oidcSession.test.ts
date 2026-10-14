import {
  DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY,
  SSO_QUERY_PARAMS_MAX_AGE_MS,
} from '../../src/lib/constants';
import {
  clearSsoQueryParams,
  hasAnySsoQueryParam,
  restoreSsoQueryParams,
  storeSsoQueryParams,
} from '../../src/lib/helpers/oidcSession';

const PARAMS = {
  oidcIdpStateId: 's-abc123',
  ssoAppId: 'descope-default-oidc',
  oidcErrorRedirectUri: 'http://localhost:3000/callback',
  descopeIdpInitiated: false,
};

const setLocation = (url: string) => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: new URL(url),
  });
};

// jsdom's performance has no getEntriesByType at all, so it cannot be spied on,
// it has to be defined. Its absence is also the real fail-closed case, covered
// by removeNavigationTiming below.
const setNavigationType = (type: string | null) => {
  Object.defineProperty(window.performance, 'getEntriesByType', {
    configurable: true,
    writable: true,
    value: jest.fn().mockReturnValue(type ? [{ type }] : []),
  });
};

const removeNavigationTiming = () => {
  // eslint-disable-next-line no-underscore-dangle
  delete (window.performance as any).getEntriesByType;
};

describe('oidcSession', () => {
  beforeEach(() => {
    sessionStorage.clear();
    setLocation('http://localhost:3000/login');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('hasAnySsoQueryParam', () => {
    it('is true when a param has a value', () => {
      expect(hasAnySsoQueryParam(PARAMS)).toBe(true);
    });

    it('is false for an empty object', () => {
      expect(hasAnySsoQueryParam({})).toBe(false);
    });

    // descopeIdpInitiated is a boolean and is always present on the object, so
    // a key based check would wrongly report a plain flow as having params
    it('is false when only descopeIdpInitiated is present and false', () => {
      expect(hasAnySsoQueryParam({ descopeIdpInitiated: false })).toBe(false);
    });

    it('is true when descopeIdpInitiated is true', () => {
      expect(hasAnySsoQueryParam({ descopeIdpInitiated: true })).toBe(true);
    });

    it('is false when every value is an empty string', () => {
      expect(hasAnySsoQueryParam({ oidcIdpStateId: '', ssoAppId: '' })).toBe(
        false,
      );
    });
  });

  describe('storeSsoQueryParams', () => {
    it('stores when there is something to store', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      const raw = sessionStorage.getItem(
        DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY,
      );
      expect(JSON.parse(raw).params).toEqual(PARAMS);
    });

    it('stores nothing when there are no params', () => {
      storeSsoQueryParams({ descopeIdpInitiated: false }, 'P1', 'sign-in');
      expect(
        sessionStorage.getItem(DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY),
      ).toBeNull();
    });

    it('does not throw when sessionStorage throws', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('nope');
      });
      expect(() => storeSsoQueryParams(PARAMS, 'P1', 'sign-in')).not.toThrow();
    });
  });

  describe('restoreSsoQueryParams', () => {
    it('restores on a reload, same scope, fresh entry', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      setNavigationType('reload');
      expect(restoreSsoQueryParams('P1', 'sign-in')).toEqual(PARAMS);
    });

    it('restores on a second reload in a row', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      setNavigationType('reload');
      expect(restoreSsoQueryParams('P1', 'sign-in')).toEqual(PARAMS);
      expect(restoreSsoQueryParams('P1', 'sign-in')).toEqual(PARAMS);
    });

    // the rule the whole security argument rests on: a crafted link opened in
    // the same tab is a navigation, not a reload, so it gets nothing
    it('does not restore on a navigation', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      setNavigationType('navigate');
      expect(restoreSsoQueryParams('P1', 'sign-in')).toBeNull();
    });

    it('does not restore on back_forward', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      setNavigationType('back_forward');
      expect(restoreSsoQueryParams('P1', 'sign-in')).toBeNull();
    });

    // fail closed: if the browser tells us nothing, we guess nothing
    it('does not restore when there is no navigation entry', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      setNavigationType(null);
      expect(restoreSsoQueryParams('P1', 'sign-in')).toBeNull();
    });

    it('does not restore when the browser has no navigation timing at all', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      removeNavigationTiming();
      expect(restoreSsoQueryParams('P1', 'sign-in')).toBeNull();
    });

    it('does not restore when there is nothing stored', () => {
      setNavigationType('reload');
      expect(restoreSsoQueryParams('P1', 'sign-in')).toBeNull();
    });

    it.each([
      ['origin', 'http://evil.test/login', 'P1', 'sign-in'],
      ['path', 'http://localhost:3000/other', 'P1', 'sign-in'],
      ['project', 'http://localhost:3000/login', 'P2', 'sign-in'],
      ['flow', 'http://localhost:3000/login', 'P1', 'sign-up'],
    ])(
      'does not restore when the %s differs',
      (_name, url, projectId, flowId) => {
        storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
        setNavigationType('reload');
        setLocation(url);
        expect(restoreSsoQueryParams(projectId, flowId)).toBeNull();
      },
    );

    it('does not restore an entry older than the cap', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      setNavigationType('reload');
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(Date.now() + SSO_QUERY_PARAMS_MAX_AGE_MS + 1);
      expect(restoreSsoQueryParams('P1', 'sign-in')).toBeNull();
    });

    it('restores an entry just inside the cap', () => {
      const start = Date.now();
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      setNavigationType('reload');
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(start + SSO_QUERY_PARAMS_MAX_AGE_MS - 1000);
      expect(restoreSsoQueryParams('P1', 'sign-in')).toEqual(PARAMS);
    });

    it('returns null on a broken entry', () => {
      sessionStorage.setItem(
        DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY,
        'not json',
      );
      setNavigationType('reload');
      expect(restoreSsoQueryParams('P1', 'sign-in')).toBeNull();
    });

    it('returns null when sessionStorage throws', () => {
      setNavigationType('reload');
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('nope');
      });
      expect(restoreSsoQueryParams('P1', 'sign-in')).toBeNull();
    });
  });

  describe('clearSsoQueryParams', () => {
    it('removes the entry', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      clearSsoQueryParams();
      expect(
        sessionStorage.getItem(DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY),
      ).toBeNull();
    });

    it('does not throw when sessionStorage throws', () => {
      jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('nope');
      });
      expect(() => clearSsoQueryParams()).not.toThrow();
    });
  });
});
