import {
  DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY,
  SSO_QUERY_PARAMS_MAX_AGE_MS,
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
//   - the entry is younger than the server side state_id lifetime
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

const buildScope = (projectId: string, flowId: string): ScopeKey => ({
  origin: window.location.origin,
  pathname: window.location.pathname,
  hash: window.location.hash,
  projectId,
  flowId,
});

// `descopeIdpInitiated` is a boolean and is always present on the object, so an
// "is there anything here" check has to look at values, not at keys.
// Every field is a string or a boolean, so plain truthiness is enough.
export const hasAnySsoQueryParam = (params: Partial<SSOQueryParams>): boolean =>
  Object.values(params ?? {}).some(Boolean);

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
// by getSsoQueryParamsScope.
const isSameScope = (a: ScopeKey, b: ScopeKey): boolean =>
  a?.origin === b.origin &&
  a?.pathname === b.pathname &&
  a?.hash === b.hash &&
  a?.projectId === b.projectId &&
  a?.flowId === b.flowId;

export const storeSsoQueryParams = (
  params: Partial<SSOQueryParams>,
  projectId: string,
  flowId: string,
): void => {
  if (!hasAnySsoQueryParam(params)) {
    return;
  }
  try {
    const entry: StoredEntry = {
      params,
      scope: buildScope(projectId, flowId),
      ts: Date.now(),
    };
    window.sessionStorage?.setItem(
      DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY,
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
    const raw = window.sessionStorage?.getItem(
      DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY,
    );
    if (!raw) {
      return null;
    }
    const entry: StoredEntry = JSON.parse(raw);
    if (!isSameScope(entry?.scope, buildScope(projectId, flowId))) {
      return null;
    }
    if (Date.now() - entry.ts >= SSO_QUERY_PARAMS_MAX_AGE_MS) {
      return null;
    }
    return entry.params;
  } catch (e) {
    return null;
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
  if (isPageReload()) {
    return;
  }
  try {
    const raw = window.sessionStorage?.getItem(
      DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY,
    );
    if (!raw) {
      return;
    }
    const entry: StoredEntry = JSON.parse(raw);
    if (isSameScope(entry?.scope, buildScope(projectId, flowId))) {
      window.sessionStorage?.removeItem(
        DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY,
      );
    }
  } catch (e) {
    // nothing to do
  }
};

export const clearSsoQueryParams = (): void => {
  try {
    window.sessionStorage?.removeItem(
      DESCOPE_SSO_QUERY_PARAMS_SESSION_STORAGE_KEY,
    );
  } catch (e) {
    // nothing to do
  }
};
