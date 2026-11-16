import {
  DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY_PREFIX,
  DESCOPE_SSO_RUN_STORAGE_KEY_PREFIX,
  SSO_QUERY_PARAMS_MAX_AGE_MS,
  SSO_QUERY_PARAMS_WITH_ERROR_REDIRECT_MAX_AGE_MS,
} from '../../src/lib/constants';
import {
  adoptRunSsoContext,
  clearSsoContextOnAppRedirect,
  clearSsoQueryParams,
  dropStaleSsoQueryParams,
  hasAnySsoQueryParam,
  linkRunToSsoContext,
  pickSsoQueryParams,
  restoreSsoQueryParams,
  storeSsoQueryParams,
  markScopeFirstInit,
  sweepExpiredRunEntries,
} from '../../src/lib/helpers/oidcSession';
import {
  resetCustomStorage,
  setCustomStorage,
} from '../../src/lib/helpers/storage';

// the storage key carries the project and flow, so two flows never collide
const keyFor = (projectId = 'P1', flowId = 'sign-in') =>
  `${DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY_PREFIX}_${projectId}_${flowId}`;

const PARAMS = {
  oidcIdpStateId: 's-abc123',
  ssoAppId: 'descope-default-oidc',
  oidcErrorRedirectUri: 'http://localhost:3000/callback',
  descopeIdpInitiated: false,
};

const NO_ERROR_REDIRECT = {
  oidcIdpStateId: 's-abc123',
  ssoAppId: 'descope-default-oidc',
  descopeIdpInitiated: false,
};

// what a run entry holds: the component links `pickSsoQueryParams` of its flow
// state, which drops empty values such as `descopeIdpInitiated: false`
const LINKED = {
  oidcIdpStateId: PARAMS.oidcIdpStateId,
  ssoAppId: PARAMS.ssoAppId,
  oidcErrorRedirectUri: PARAMS.oidcErrorRedirectUri,
};
const LINKED_NO_ERROR_REDIRECT = {
  oidcIdpStateId: NO_ERROR_REDIRECT.oidcIdpStateId,
  ssoAppId: NO_ERROR_REDIRECT.ssoAppId,
};

const RUN_ID = '3LxlQm0olL1UllpmpekeXGNgrlb';
const runKeyFor = (runId = RUN_ID) =>
  `${DESCOPE_SSO_RUN_STORAGE_KEY_PREFIX}${runId}`;

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
      const raw = sessionStorage.getItem(keyFor());
      expect(JSON.parse(raw).params).toEqual(PARAMS);
    });

    it('stores nothing when there are no params', () => {
      storeSsoQueryParams({ descopeIdpInitiated: false }, 'P1', 'sign-in');
      expect(sessionStorage.getItem(keyFor())).toBeNull();
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
      storeSsoQueryParams(NO_ERROR_REDIRECT, 'P1', 'sign-in');
      setNavigationType('reload');
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(Date.now() + SSO_QUERY_PARAMS_MAX_AGE_MS + 1);
      expect(restoreSsoQueryParams('P1', 'sign-in')).toBeNull();
    });

    it('restores an OIDC entry with an error redirect past the cap, so the app gets the user back', () => {
      const start = Date.now();
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      setNavigationType('reload');
      jest.spyOn(Date, 'now').mockReturnValue(start + 30 * 60 * 1000);
      expect(restoreSsoQueryParams('P1', 'sign-in')).toEqual(PARAMS);
    });

    it('does not restore an OIDC entry with an error redirect past the long cap', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      setNavigationType('reload');
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(
          Date.now() + SSO_QUERY_PARAMS_WITH_ERROR_REDIRECT_MAX_AGE_MS + 1,
        );
      expect(restoreSsoQueryParams('P1', 'sign-in')).toBeNull();
    });

    it.each([
      ['SAML', { samlIdpStateId: 'saml-1', ssoAppId: 'app' }],
      ['WS-Fed', { wsfedIdpStateId: 'wsfed-1', ssoAppId: 'app' }],
      ['OIDC without an error redirect', NO_ERROR_REDIRECT],
      [
        'an error redirect without a state',
        { oidcErrorRedirectUri: 'http://localhost:3000/callback' },
      ],
    ])('keeps the short cap for %s', (_name, params) => {
      storeSsoQueryParams(params, 'P1', 'sign-in');
      setNavigationType('reload');
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(Date.now() + SSO_QUERY_PARAMS_MAX_AGE_MS + 60 * 1000);
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
      sessionStorage.setItem(keyFor(), 'not json');
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
      expect(sessionStorage.getItem(keyFor())).toBeNull();
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
      expect(sessionStorage.getItem(keyFor())).not.toBeNull();
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
  describe('markScopeFirstInit', () => {
    it('is true once per flow and false after that', () => {
      expect(markScopeFirstInit('Pc', 'flow-a')).toBe(true);
      expect(markScopeFirstInit('Pc', 'flow-a')).toBe(false);
      expect(markScopeFirstInit('Pc', 'flow-a')).toBe(false);
    });

    it('is tracked per flow, so a second component on the page still gets one', () => {
      expect(markScopeFirstInit('Pd', 'flow-b')).toBe(true);
      expect(markScopeFirstInit('Pd', 'flow-c')).toBe(true);
      expect(markScopeFirstInit('Pd', 'flow-b')).toBe(false);
    });

    it('is tracked per url, so the same flow on another route gets its own', () => {
      setLocation('http://localhost:3000/one');
      expect(markScopeFirstInit('Pe', 'flow-d')).toBe(true);
      setLocation('http://localhost:3000/two');
      expect(markScopeFirstInit('Pe', 'flow-d')).toBe(true);
    });
  });

  // Shuni, PR #1514 round 2. One page can host several flows sharing a single
  // storage entry, so an unrelated flow completing must not wipe this one.
  describe('clearSsoQueryParams is scope aware', () => {
    it('leaves another flow entry alone', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      clearSsoQueryParams('P1', 'sign-up');
      expect(sessionStorage.getItem(keyFor())).not.toBeNull();
    });

    it('leaves another project entry alone', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      clearSsoQueryParams('P2', 'sign-in');
      expect(sessionStorage.getItem(keyFor())).not.toBeNull();
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

  // asafshen on PR #1514: a single shared key meant the last flow to store won,
  // so two flows on one page clobbered each other and the loser lost its redirect
  describe('one entry per flow', () => {
    it('two flows on the same page both keep their own params', () => {
      const other = { oidcIdpStateId: 's-other', ssoAppId: 'app-b' };
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      storeSsoQueryParams(other, 'P1', 'sign-up');
      setNavigationType('reload');
      expect(restoreSsoQueryParams('P1', 'sign-in')).toEqual(PARAMS);
      expect(restoreSsoQueryParams('P1', 'sign-up')).toEqual(other);
    });

    it('the same flow in two projects does not collide', () => {
      const other = { oidcIdpStateId: 's-p2' };
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      storeSsoQueryParams(other, 'P2', 'sign-in');
      setNavigationType('reload');
      expect(restoreSsoQueryParams('P1', 'sign-in')).toEqual(PARAMS);
      expect(restoreSsoQueryParams('P2', 'sign-in')).toEqual(other);
    });

    it('clearing one flow leaves the other untouched', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      storeSsoQueryParams({ oidcIdpStateId: 's-other' }, 'P1', 'sign-up');
      clearSsoQueryParams('P1', 'sign-up');
      setNavigationType('reload');
      expect(restoreSsoQueryParams('P1', 'sign-in')).toEqual(PARAMS);
      expect(restoreSsoQueryParams('P1', 'sign-up')).toBeNull();
    });
  });

  describe('clearSsoQueryParams', () => {
    it('removes the entry', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      clearSsoQueryParams('P1', 'sign-in');
      expect(sessionStorage.getItem(keyFor())).toBeNull();
    });

    it('does not throw when sessionStorage throws', () => {
      jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('nope');
      });
      expect(() => clearSsoQueryParams('P1', 'sign-in')).not.toThrow();
    });
  });

  describe('pickSsoQueryParams', () => {
    it('keeps only the SSO keys that have a value', () => {
      expect(
        pickSsoQueryParams({
          ...PARAMS,
          oidcLoginHint: '',
          baseUrl: 'http://localhost:8000',
          deferredRedirect: true,
        } as any),
      ).toEqual({
        oidcIdpStateId: PARAMS.oidcIdpStateId,
        ssoAppId: PARAMS.ssoAppId,
        oidcErrorRedirectUri: PARAMS.oidcErrorRedirectUri,
      });
    });
  });

  // tab A starts the run with the OIDC params, tab B is the page a magic link
  // opens on the same run. Both share localStorage, each has its own
  // sessionStorage, which the tests model by clearing sessionStorage.
  describe('run context', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      resetCustomStorage();
    });

    it('a page continuing the run gets the context of the tab that started it', () => {
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      linkRunToSsoContext(RUN_ID, PARAMS, 'P1', 'sign-in');
      sessionStorage.clear();

      expect(adoptRunSsoContext(RUN_ID, 'P1', 'sign-in')).toEqual(LINKED);
      setNavigationType('reload');
      expect(restoreSsoQueryParams('P1', 'sign-in')).toEqual(LINKED);
    });

    it('adopting keeps the age of the original context', () => {
      const start = Date.now();
      storeSsoQueryParams(NO_ERROR_REDIRECT, 'P1', 'sign-in');
      linkRunToSsoContext(RUN_ID, NO_ERROR_REDIRECT, 'P1', 'sign-in');
      sessionStorage.clear();
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(start + SSO_QUERY_PARAMS_MAX_AGE_MS - 1000);
      expect(adoptRunSsoContext(RUN_ID, 'P1', 'sign-in')).toEqual(
        LINKED_NO_ERROR_REDIRECT,
      );
      setNavigationType('reload');
      (Date.now as jest.Mock).mockReturnValue(
        start + SSO_QUERY_PARAMS_MAX_AGE_MS + 1000,
      );
      expect(restoreSsoQueryParams('P1', 'sign-in')).toBeNull();
    });

    it('a run nobody linked gives nothing', () => {
      linkRunToSsoContext(RUN_ID, PARAMS, 'P1', 'sign-in');
      expect(adoptRunSsoContext('3Lsomeotherrun', 'P1', 'sign-in')).toBeNull();
      expect(sessionStorage.getItem(keyFor())).toBeNull();
    });

    it('an empty run id never links or adopts', () => {
      linkRunToSsoContext('', PARAMS, 'P1', 'sign-in');
      expect(localStorage.length).toBe(0);
      expect(adoptRunSsoContext('', 'P1', 'sign-in')).toBeNull();
    });

    it('a run without SSO params is not linked', () => {
      linkRunToSsoContext(RUN_ID, { descopeIdpInitiated: false }, 'P1', 'f');
      expect(localStorage.getItem(runKeyFor())).toBeNull();
    });

    it.each([
      [
        'OIDC without an error redirect, after the short cap',
        NO_ERROR_REDIRECT,
        SSO_QUERY_PARAMS_MAX_AGE_MS + 1,
      ],
      [
        'OIDC with an error redirect, after the long cap',
        PARAMS,
        SSO_QUERY_PARAMS_WITH_ERROR_REDIRECT_MAX_AGE_MS + 1,
      ],
    ])('does not adopt %s', (_name, params, age) => {
      const start = Date.now();
      linkRunToSsoContext(RUN_ID, params, 'P1', 'sign-in');
      jest.spyOn(Date, 'now').mockReturnValue(start + age);
      expect(adoptRunSsoContext(RUN_ID, 'P1', 'sign-in')).toBeNull();
    });

    it('linking sweeps expired run entries, all of them, and keeps live ones', () => {
      const old = JSON.stringify({ params: NO_ERROR_REDIRECT, ts: 0 });
      // adjacent expired keys: removing while walking by index would skip one
      localStorage.setItem(runKeyFor('a'), old);
      localStorage.setItem(runKeyFor('b'), old);
      localStorage.setItem(runKeyFor('c'), 'not json');
      localStorage.setItem('unrelated', old);

      linkRunToSsoContext(RUN_ID, PARAMS, 'P1', 'sign-in');

      expect(localStorage.getItem(runKeyFor('a'))).toBeNull();
      expect(localStorage.getItem(runKeyFor('b'))).toBeNull();
      expect(localStorage.getItem(runKeyFor('c'))).toBeNull();
      expect(localStorage.getItem('unrelated')).toBe(old);
      expect(localStorage.getItem(runKeyFor())).not.toBeNull();
    });

    it('keeps run entries in localStorage even when a customStorage is set', () => {
      const store: Record<string, string> = {};
      setCustomStorage({
        getItem: (k) => store[k] ?? null,
        setItem: (k, v) => {
          store[k] = v;
        },
        removeItem: (k) => {
          delete store[k];
        },
      });
      linkRunToSsoContext(RUN_ID, PARAMS, 'P1', 'sign-in');
      expect(store[runKeyFor()]).toBeUndefined();
      expect(localStorage.getItem(runKeyFor())).not.toBeNull();
      expect(adoptRunSsoContext(RUN_ID, 'P1', 'sign-in')).toEqual(LINKED);
    });

    it('sweeps expired run entries on its own, keeping live and unrelated ones', () => {
      const old = JSON.stringify({ params: NO_ERROR_REDIRECT, ts: 0 });
      localStorage.setItem(runKeyFor('a'), old);
      localStorage.setItem('unrelated', old);
      linkRunToSsoContext(RUN_ID, PARAMS, 'P1', 'sign-in');
      sweepExpiredRunEntries();
      expect(localStorage.getItem(runKeyFor('a'))).toBeNull();
      expect(localStorage.getItem('unrelated')).toBe(old);
      expect(localStorage.getItem(runKeyFor())).not.toBeNull();
    });

    it('never puts the login hint or the SAML username in a run entry', () => {
      linkRunToSsoContext(
        RUN_ID,
        {
          ...PARAMS,
          oidcLoginHint: 'user@example.com',
          samlIdpUsername: 'user@example.com',
        },
        'P1',
        'sign-in',
      );
      expect(localStorage.getItem(runKeyFor())).not.toContain('user@example');
      expect(adoptRunSsoContext(RUN_ID, 'P1', 'sign-in')).toEqual(LINKED);
    });

    it('a run with only personal data is not linked', () => {
      linkRunToSsoContext(
        RUN_ID,
        { oidcLoginHint: 'user@example.com' },
        'P1',
        'sign-in',
      );
      expect(localStorage.getItem(runKeyFor())).toBeNull();
    });

    it('does not adopt a run linked for another project', () => {
      linkRunToSsoContext(RUN_ID, PARAMS, 'P1', 'sign-in');
      expect(adoptRunSsoContext(RUN_ID, 'P2', 'sign-in')).toBeNull();
      expect(sessionStorage.getItem(keyFor('P2'))).toBeNull();
    });

    it('takes only the SSO keys from a stored run entry', () => {
      localStorage.setItem(
        runKeyFor(),
        JSON.stringify({
          params: { ...PARAMS, executionId: 'x|#|y', stepId: '9' },
          ts: Date.now(),
          projectId: 'P1',
        }),
      );
      expect(adoptRunSsoContext(RUN_ID, 'P1', 'sign-in')).toEqual(LINKED);
    });

    it('does not throw when storage throws', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('nope');
      });
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('nope');
      });
      expect(() =>
        linkRunToSsoContext(RUN_ID, PARAMS, 'P1', 'sign-in'),
      ).not.toThrow();
      expect(adoptRunSsoContext(RUN_ID, 'P1', 'sign-in')).toBeNull();
    });
  });

  // the login ends with a redirect to the app's redirect_uri, the address the
  // server also gives as oidc_error_redirect_uri
  describe('clearSsoContextOnAppRedirect', () => {
    const setUp = () => {
      setLocation('https://auth.example.com/login');
      storeSsoQueryParams(PARAMS, 'P1', 'sign-in');
      linkRunToSsoContext(RUN_ID, PARAMS, 'P1', 'sign-in');
    };
    const entriesLeft = () => ({
      tab: sessionStorage.getItem(keyFor()) !== null,
      run: localStorage.getItem(runKeyFor()) !== null,
    });

    beforeEach(() => {
      localStorage.clear();
    });

    it.each([
      ['with a code', 'http://localhost:3000/callback?code=c1&state=s1'],
      [
        'with an error',
        'http://localhost:3000/callback?error=session%20expired&state=s1',
      ],
    ])('removes both entries on the redirect to the app %s', (_n, url) => {
      setUp();
      clearSsoContextOnAppRedirect(url, RUN_ID, PARAMS, 'P1', 'sign-in');
      expect(entriesLeft()).toEqual({ tab: false, run: false });
    });

    it.each([
      [
        'an OAuth provider mid-flow',
        'https://accounts.google.com/o/oauth2/v2/auth?client_id=x',
      ],
      ['another path of the app', 'http://localhost:3000/other?code=c1'],
      ['another port', 'http://localhost:3001/callback?code=c1'],
      ['a relative url on the login page', '/login?x=1'],
      ['a url that cannot be parsed', 'http://'],
    ])('keeps both entries on a redirect to %s', (_n, url) => {
      setUp();
      clearSsoContextOnAppRedirect(url, RUN_ID, PARAMS, 'P1', 'sign-in');
      expect(entriesLeft()).toEqual({ tab: true, run: true });
    });

    it('keeps both entries when the flow has no error redirect', () => {
      setUp();
      clearSsoContextOnAppRedirect(
        'http://localhost:3000/callback?code=c1',
        RUN_ID,
        NO_ERROR_REDIRECT,
        'P1',
        'sign-in',
      );
      expect(entriesLeft()).toEqual({ tab: true, run: true });
    });

    it('does not throw when storage throws', () => {
      setUp();
      jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('nope');
      });
      expect(() =>
        clearSsoContextOnAppRedirect(
          'http://localhost:3000/callback?code=c1',
          RUN_ID,
          PARAMS,
          'P1',
          'sign-in',
        ),
      ).not.toThrow();
      (Storage.prototype.removeItem as jest.Mock).mockRestore();
    });
  });
});
