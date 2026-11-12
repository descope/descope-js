import {
  DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY_PREFIX,
  DESCOPE_SSO_RUN_STORAGE_KEY_PREFIX,
  SSO_QUERY_PARAMS_MAX_AGE_MS,
  SSO_QUERY_PARAMS_WITH_ERROR_REDIRECT_MAX_AGE_MS,
} from '../constants';
import type { SSOQueryParams } from '../types';

// The SSO / OIDC query params are read off the URL once and removed from it
// (see handleUrlParams), so a page refresh mid-flow loses the OIDC context and
// the user is never redirected back to the app that sent them here.
//
// They are kept in sessionStorage (tab scoped, cleared when the tab closes) so a
// refresh can recover them, and handed back only when all of these hold:
//   - the page was actually reloaded, not navigated to
//   - it is the same origin, path, project and flow
//   - the entry is younger than the server side state_id lifetime, or, for an
//     OIDC context that carries the app's error redirect, younger than a day
//     (see isWithinMaxAge)
// Anything else gets nothing. A crafted link opened in the same tab is a
// navigation, not a reload, so it can never pick up a stored context.
//
// Restored values go into the component's state only. They are deliberately not
// written back into the URL, which would put state_id into the address bar,
// Referer and history for the rest of the flow.

type ScopeKey = {
  origin: string;
  pathname: string;
  // a hash-routed app keeps every route on the same pathname, so without this
  // /#/login and /#/other would look like the same page
  hash: string;
  projectId: string;
  flowId: string;
};

type StoredEntry = {
  params: Partial<SSOQueryParams>;
  scope: ScopeKey;
  ts: number;
};

// Which flows have already initialized in THIS document.
// A document is loaded once, so only the first init of a given flow after that
// load can be the refresh. `PerformanceNavigationTiming.type` belongs to the
// document and stays 'reload' for its whole life, so without this one reload
// would make every later remount of the component in a single page app look
// like a refresh too. Comparing URLs cannot fix that, because the remount can
// be at the very same URL. This empties itself: a real refresh builds a new
// document, and the module starts over with it.
const initializedScopes = new Set<string>();

const buildScope = (projectId: string, flowId: string): ScopeKey => ({
  origin: window.location.origin,
  pathname: window.location.pathname,
  hash: window.location.hash,
  projectId,
  flowId,
});

const scopeId = (s: ScopeKey): string =>
  [s.origin, s.pathname, s.hash, s.projectId, s.flowId].join('|');

// One entry per project and flow. A single shared key meant the last flow to
// store won, so two flows on the same page would clobber each other and the
// loser lost its redirect.
const storageKey = (projectId: string, flowId: string): string =>
  `${DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY_PREFIX}_${projectId}_${flowId}`;

// True only on the first init of this flow in this document. Must be called on
// every init, not only on the branch that restores, otherwise a first load
// carrying the params would leave the flow unmarked for a later remount.
export const markScopeFirstInit = (
  projectId: string,
  flowId: string,
): boolean => {
  const id = scopeId(buildScope(projectId, flowId));
  if (initializedScopes.has(id)) {
    return false;
  }
  initializedScopes.add(id);
  return true;
};

/**
 * Forget which flows have already initialized (for testing).
 *
 * In a browser this happens by itself, because a refresh builds a new document
 * and a new module instance. Tests share one document, so they call this to
 * model a fresh page load. A test that is modelling a remount inside the SAME
 * document deliberately does not call it.
 */
export const resetInitializedScopes = () => {
  initializedScopes.clear();
};

// `descopeIdpInitiated` is a boolean and is always present on the object, so an
// "is there anything here" check has to look at values, not at keys.
// Every field is a string or a boolean, so plain truthiness is enough.
export const hasAnySsoQueryParam = (params: Partial<SSOQueryParams>): boolean =>
  Object.values(params ?? {}).some(Boolean);

// The keys handleUrlParams reads. Flow state holds them next to many unrelated
// fields, so they have to be picked out by name. A Record over the type, so a
// new SSO param that is missing here fails to compile instead of being dropped.
const SSO_QUERY_PARAM_KEY_MAP: Record<keyof SSOQueryParams, true> = {
  oidcIdpStateId: true,
  samlIdpStateId: true,
  wsfedIdpStateId: true,
  samlIdpUsername: true,
  descopeIdpInitiated: true,
  ssoAppId: true,
  customAppId: true,
  oidcLoginHint: true,
  oidcPrompt: true,
  oidcErrorRedirectUri: true,
  oidcResource: true,
  thirdPartyAppId: true,
  thirdPartyAppStateId: true,
  applicationScopes: true,
};
const SSO_QUERY_PARAM_KEYS = Object.keys(SSO_QUERY_PARAM_KEY_MAP) as Array<
  keyof SSOQueryParams
>;

export const pickSsoQueryParams = (
  state: Partial<SSOQueryParams>,
): Partial<SSOQueryParams> =>
  SSO_QUERY_PARAM_KEYS.reduce(
    (acc, key) =>
      state?.[key] ? Object.assign(acc, { [key]: state[key] }) : acc,
    {} as Partial<SSOQueryParams>,
  );

// After the server side state expired, a restored state_id can only fail. That
// is still useful for OIDC when the app's error redirect comes with it, because
// the server then sends the user back to the app instead of leaving them on this
// page. Anything else keeps the state lifetime.
const isWithinMaxAge = (entry: {
  params: Partial<SSOQueryParams>;
  ts: number;
}): boolean => {
  const maxAge =
    entry?.params?.oidcIdpStateId && entry?.params?.oidcErrorRedirectUri
      ? SSO_QUERY_PARAMS_WITH_ERROR_REDIRECT_MAX_AGE_MS
      : SSO_QUERY_PARAMS_MAX_AGE_MS;
  return Date.now() - entry.ts < maxAge;
};

// Only a genuine reload of THIS page counts. Anything we cannot confirm is
// treated as not a reload, so the check fails closed.
const isPageReload = (): boolean => {
  // try/catch kept on purpose. This runs on every flow init in every customer
  // browser, and an exception here would break login, not just the restore.
  try {
    const [entry] = window.performance?.getEntriesByType?.('navigation') ?? [];
    const nav = entry as PerformanceNavigationTiming;
    if (nav?.type !== 'reload' || !nav.name) {
      return false;
    }
    // `nav.name` is the URL the DOCUMENT was loaded from, and the type stays
    // 'reload' for that document's whole life. In a single page app the router
    // can move to another route afterwards, so reloading /home and then routing
    // to /login would otherwise look like a reload of /login. The hash is part
    // of that comparison because a hash-routed app keeps every route on one
    // pathname.
    const loadedFrom = new URL(nav.name, window.location.href);
    return (
      loadedFrom.origin === window.location.origin &&
      loadedFrom.pathname === window.location.pathname &&
      loadedFrom.hash === window.location.hash
    );
  } catch (e) {
    return false;
  }
};

// `a` comes from a parsed storage entry and may be missing, `b` is always built
// by buildScope.
const isSameScope = (a: ScopeKey, b: ScopeKey): boolean =>
  a?.origin === b.origin &&
  a?.pathname === b.pathname &&
  a?.hash === b.hash &&
  a?.projectId === b.projectId &&
  a?.flowId === b.flowId;

// `ts` is passed when the context was first seen earlier, on another page, so
// its age keeps counting from then.
export const storeSsoQueryParams = (
  params: Partial<SSOQueryParams>,
  projectId: string,
  flowId: string,
  ts: number = Date.now(),
): void => {
  if (!hasAnySsoQueryParam(params)) {
    return;
  }
  try {
    const entry: StoredEntry = {
      params,
      scope: buildScope(projectId, flowId),
      ts,
    };
    window.sessionStorage?.setItem(
      storageKey(projectId, flowId),
      JSON.stringify(entry),
    );
  } catch (e) {
    // sessionStorage unavailable, losing reload persistence is acceptable
  }
};

// Read only. The entry is left in place so a second and third refresh also work,
// and it falls away on its own once it is older than the cap.
export const restoreSsoQueryParams = (
  projectId: string,
  flowId: string,
): Partial<SSOQueryParams> | null => {
  if (!isPageReload()) {
    return null;
  }
  try {
    const raw = window.sessionStorage?.getItem(storageKey(projectId, flowId));
    if (!raw) {
      return null;
    }
    const entry: StoredEntry = JSON.parse(raw);
    if (!isSameScope(entry?.scope, buildScope(projectId, flowId))) {
      return null;
    }
    if (!isWithinMaxAge(entry)) {
      return null;
    }
    return entry.params;
  } catch (e) {
    return null;
  }
};

// The age of this tab's entry, so a run started from it is linked with the time
// the context was first seen, not the time of the restart.
const getStoredSsoQueryParamsTs = (
  projectId: string,
  flowId: string,
): number | undefined => {
  try {
    const raw = window.sessionStorage?.getItem(storageKey(projectId, flowId));
    if (!raw) {
      return undefined;
    }
    const entry: StoredEntry = JSON.parse(raw);
    return isSameScope(entry?.scope, buildScope(projectId, flowId))
      ? entry.ts
      : undefined;
  } catch (e) {
    return undefined;
  }
};

// The OIDC params only reach the tab that /authorize opened. A magic link or an
// enchanted link opens another tab that continues the same run, and that tab
// never had them, so a refresh there used to start a run with no context.
// So the context is also kept per run, in storage shared by the tabs of the
// origin, keyed by the run id. A page that opens with this flow's run id in its
// URL copies that run's context into its own tab entry, and a later refresh of
// that page restores it through the normal reload path above.
// The run id is random and only the server puts it into a URL (magic link,
// OAuth return), so a page cannot pick up a context it was not given a link to.
type RunEntry = {
  params: Partial<SSOQueryParams>;
  ts: number;
  projectId: string;
};

const runStorageKey = (runId: string): string =>
  `${DESCOPE_SSO_RUN_STORAGE_KEY_PREFIX}${runId}`;

// Run entries always use the browser's localStorage, even when the app set a
// customStorage, like DSLI in web-js-sdk: they hold no personal data, and they
// must be listable so expired ones can be swept, which a customStorage cannot do.
// Accessing localStorage can throw (blocked storage), so every caller catches.
const runStorage = (): Storage | null => window.localStorage ?? null;

// The login hint and the SAML username are usually emails, and a run entry is
// shared by the tabs and outlives them, so they stay out of it. The cost: a
// login restarted from a run entry has no login hint, so its email field is not
// prefilled and the start carries no externalId from it.
const withoutPersonalData = (
  params: Partial<SSOQueryParams>,
): Partial<SSOQueryParams> => {
  const shared = { ...params };
  delete shared.oidcLoginHint;
  delete shared.samlIdpUsername;
  return shared;
};

// Entries live up to the same cap as the tab entry (10 minutes, a day for OIDC
// with an error redirect). The entry of an OIDC login that redirects back to the
// app is removed right away (clearSsoContextOnAppRedirect). Expired ones are
// swept on every flow load, and on every link for a long-lived page that starts
// runs without loading again.
// Keys are collected before any is removed, because removing while walking
// localStorage by index skips the key after each removed one.
export const sweepExpiredRunEntries = (): void => {
  try {
    const storage = runStorage();
    if (!storage) {
      return;
    }
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key?.startsWith(DESCOPE_SSO_RUN_STORAGE_KEY_PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach((key) => {
      let expired = true;
      try {
        expired = !isWithinMaxAge(JSON.parse(storage.getItem(key)));
      } catch (e) {
        // unreadable, treat as expired
      }
      if (expired) {
        storage.removeItem(key);
      }
    });
  } catch (e) {
    // localStorage unavailable, nothing to sweep
  }
};

export const linkRunToSsoContext = (
  runId: string,
  params: Partial<SSOQueryParams>,
  projectId: string,
  flowId: string,
): void => {
  const shared = withoutPersonalData(params);
  if (!runId || !hasAnySsoQueryParam(shared)) {
    return;
  }
  try {
    const entry: RunEntry = {
      params: shared,
      ts: getStoredSsoQueryParamsTs(projectId, flowId) ?? Date.now(),
      projectId,
    };
    runStorage()?.setItem(runStorageKey(runId), JSON.stringify(entry));
  } catch (e) {
    // storage unavailable, losing reload persistence is acceptable
  }
  sweepExpiredRunEntries();
};

// Copies the run's context into this tab, keeping its original age, and returns
// it. Returns null when this run was not started with one in this browser.
export const adoptRunSsoContext = (
  runId: string,
  projectId: string,
  flowId: string,
): Partial<SSOQueryParams> | null => {
  if (!runId) {
    return null;
  }
  try {
    const raw = runStorage()?.getItem(runStorageKey(runId));
    if (!raw) {
      return null;
    }
    const entry: RunEntry = JSON.parse(raw);
    // the run id alone already identifies the run. The project is checked too,
    // since one login origin can serve several projects, and only the known
    // SSO keys are taken, so a changed entry cannot set other flow state.
    const params = pickSsoQueryParams(entry?.params);
    if (
      entry?.projectId !== projectId ||
      !hasAnySsoQueryParam(params) ||
      !isWithinMaxAge(entry)
    ) {
      return null;
    }
    storeSsoQueryParams(params, projectId, flowId, entry.ts);
    return params;
  } catch (e) {
    return null;
  }
};

const removeIfScopeMatches = (projectId: string, flowId: string): void => {
  try {
    const raw = window.sessionStorage?.getItem(storageKey(projectId, flowId));
    if (!raw) {
      return;
    }
    const entry: StoredEntry = JSON.parse(raw);
    if (isSameScope(entry?.scope, buildScope(projectId, flowId))) {
      window.sessionStorage?.removeItem(storageKey(projectId, flowId));
    }
  } catch (e) {
    // nothing to do
  }
};

// A fresh visit to this page that carries no OIDC params means any stored
// context belongs to an earlier, abandoned visit. Drop it here, otherwise a
// later refresh of this same page would resurrect it. Without this, one crafted
// link is enough to plant a state_id that a legitimate login refresh then
// completes, which is exactly what the reload check exists to prevent.
export const dropStaleSsoQueryParams = (
  projectId: string,
  flowId: string,
): void => {
  // A remount inside a reloaded document is not a fresh visit, so the entry is
  // left alone for a genuine later refresh to use.
  if (isPageReload()) {
    return;
  }
  removeIfScopeMatches(projectId, flowId);
};

// Scope aware on purpose. One page can host several <descope-wc> flows and they
// share a single storage entry, so an unrelated flow completing must not delete
// an OIDC flow's context. Finishing a sign-up in the same tab used to wipe a
// parallel sign-in's entry, and the sign-in then lost its redirect on refresh.
export const clearSsoQueryParams = (projectId: string, flowId: string): void =>
  removeIfScopeMatches(projectId, flowId);

// An OIDC login ends with a redirect back to the app's redirect_uri, the same
// address the server put into oidc_error_redirect_uri. A redirect there, with a
// code or with an error, means the login is over, so this tab's entry and the
// run entry are removed now instead of waiting to expire. Any other redirect,
// like one to an OAuth provider mid-flow, leaves both alone, and so does a flow
// without an error redirect, whose entries expire after 10 minutes anyway.
export const clearSsoContextOnAppRedirect = (
  redirectTo: string,
  runId: string,
  params: Partial<SSOQueryParams>,
  projectId: string,
  flowId: string,
): void => {
  if (!params?.oidcErrorRedirectUri) {
    return;
  }
  try {
    const target = new URL(redirectTo, window.location.href);
    const app = new URL(params.oidcErrorRedirectUri);
    if (target.origin !== app.origin || target.pathname !== app.pathname) {
      return;
    }
  } catch (e) {
    return;
  }
  clearSsoQueryParams(projectId, flowId);
  try {
    if (runId) {
      runStorage()?.removeItem(runStorageKey(runId));
    }
  } catch (e) {
    // localStorage blocked, the run entry expires instead
  }
};
