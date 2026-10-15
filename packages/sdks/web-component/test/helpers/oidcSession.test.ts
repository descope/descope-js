import {
  DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY,
  SSO_QUERY_PARAMS_MAX_AGE_MS,
} from '../../src/lib/constants';
import {
  clearSsoQueryParams,
  dropStaleSsoQueryParams,
  hasAnySsoQueryParam,
  restoreSsoQueryParams,
  storeSsoQueryParams,
  takeReloadCredit,
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
// `name` is the URL the document was loaded from. It defaults to the current
// location, which is the ordinary case; pass it explicitly to model a single
// page app that reloaded one route and then routed to another.
const setNavigationType = (type: string | null, name?: string) => {
  Object.defineProperty(window.performance, 'getEntriesByType', {
    configurable: true,
    writable: true,
    value: jest
      .fn()
      .mockReturnValue(
        type ? [{ type, name: name ?? window.location.href }] : [],
      ),
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

    it('does not restore when the document was loaded from another route', () => {
      // single page app: /home was reloaded, then the router moved to /login.
      // navigation type stays 'reload' for the whole document, so without the
      // name check this would look like a reload of /login
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      setNavigationType('reload', 'http://localhost:3000/home');
      expect(restoreSsoQueryParams('P1', 'sign-in')).toBeNull();
    });

    // hash routers keep every route on the same pathname, so without comparing
    // the hash /#/home and /#/login look like the same page
    it('does not restore when a hash route was reloaded and then changed', () => {
      setLocation('http://localhost:3000/#/login');
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      setNavigationType('reload', 'http://localhost:3000/#/home');
      expect(restoreSsoQueryParams('P1', 'sign-in')).toBeNull();
    });

    it('restores on a reload of the same hash route', () => {
      setLocation('http://localhost:3000/#/login');
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      setNavigationType('reload', 'http://localhost:3000/#/login');
      expect(restoreSsoQueryParams('P1', 'sign-in')).toEqual(PARAMS);
    });

    it('does not restore an entry stored on another hash route', () => {
      setLocation('http://localhost:3000/#/login');
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      // same document reload, but the app is now on a different hash route
      setLocation('http://localhost:3000/#/other');
      setNavigationType('reload', 'http://localhost:3000/#/other');
      expect(restoreSsoQueryParams('P1', 'sign-in')).toBeNull();
    });

    it('does not restore when the navigation entry has no name', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      Object.defineProperty(window.performance, 'getEntriesByType', {
        configurable: true,
        writable: true,
        value: jest.fn().mockReturnValue([{ type: 'reload' }]),
      });
      expect(restoreSsoQueryParams('P1', 'sign-in')).toBeNull();
    });
  });

  // the hole Shuni found on PR #1514: the entry used to survive a fresh visit,
  // so one crafted link could plant a state_id that a later refresh of a
  // legitimate login on the same page would then complete
  describe('dropStaleSsoQueryParams', () => {
    it('drops a matching entry on a fresh navigation', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      setNavigationType('navigate');
      dropStaleSsoQueryParams('P1', 'sign-in');
      expect(
        sessionStorage.getItem(DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY),
      ).toBeNull();
    });

    it('keeps the entry on a reload, so refreshing still works', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      setNavigationType('reload');
      dropStaleSsoQueryParams('P1', 'sign-in');
      expect(restoreSsoQueryParams('P1', 'sign-in')).toEqual(PARAMS);
    });

    it('leaves another page entry alone', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      setNavigationType('navigate');
      dropStaleSsoQueryParams('P2', 'other-flow');
      expect(
        sessionStorage.getItem(DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY),
      ).not.toBeNull();
    });

    // the full attack path, end to end in one test
    it('a crafted link then a refresh of a clean visit restores nothing', () => {
      // 1. victim opens the crafted link, params get stored
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      // 2. victim later opens the same login page with no params
      setNavigationType('navigate');
      expect(restoreSsoQueryParams('P1', 'sign-in')).toBeNull();
      dropStaleSsoQueryParams('P1', 'sign-in');
      // 3. victim refreshes that clean page
      setNavigationType('reload');
      expect(restoreSsoQueryParams('P1', 'sign-in')).toBeNull();
    });
  });

  // Shuni, PR #1514 round 2. The credit is what stops one reload from licensing
  // every later remount in a single page app, which URL comparisons cannot do
  // because the remount can be at the very same URL.
  describe('takeReloadCredit', () => {
    it('is true once per flow and false after that', () => {
      expect(takeReloadCredit('Pc', 'flow-a')).toBe(true);
      expect(takeReloadCredit('Pc', 'flow-a')).toBe(false);
      expect(takeReloadCredit('Pc', 'flow-a')).toBe(false);
    });

    it('is tracked per flow, so a second component on the page still gets one', () => {
      expect(takeReloadCredit('Pd', 'flow-b')).toBe(true);
      expect(takeReloadCredit('Pd', 'flow-c')).toBe(true);
      expect(takeReloadCredit('Pd', 'flow-b')).toBe(false);
    });

    it('is tracked per url, so the same flow on another route gets its own', () => {
      setLocation('http://localhost:3000/one');
      expect(takeReloadCredit('Pe', 'flow-d')).toBe(true);
      setLocation('http://localhost:3000/two');
      expect(takeReloadCredit('Pe', 'flow-d')).toBe(true);
    });
  });

  // Shuni, PR #1514 round 2. One page can host several flows sharing a single
  // storage entry, so an unrelated flow completing must not wipe this one.
  describe('clearSsoQueryParams is scope aware', () => {
    it('leaves another flow entry alone', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      clearSsoQueryParams('P1', 'sign-up');
      expect(
        sessionStorage.getItem(DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY),
      ).not.toBeNull();
    });

    it('leaves another project entry alone', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      clearSsoQueryParams('P2', 'sign-in');
      expect(
        sessionStorage.getItem(DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY),
      ).not.toBeNull();
    });

    // the reported case: finish an ordinary sign-up in the same tab and the
    // parallel OIDC sign-in must still be able to recover on refresh
    it('an unrelated flow completing does not break a later refresh', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      clearSsoQueryParams('P1', 'sign-up');
      setNavigationType('reload');
      expect(restoreSsoQueryParams('P1', 'sign-in')).toEqual(PARAMS);
    });
  });

  describe('clearSsoQueryParams', () => {
    it('removes the entry', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      clearSsoQueryParams('P1', 'sign-in');
      expect(
        sessionStorage.getItem(DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY),
      ).toBeNull();
    });

    it('does not throw when sessionStorage throws', () => {
      jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('nope');
      });
      expect(() => clearSsoQueryParams('P1', 'sign-in')).not.toThrow();
    });
  });
});
