/** localStorage key indicating this browser has an active authenticated session.
 * Presence is used to decide whether the up-front /try-refresh call can be skipped. */
export const LOGGED_IN_INDICATOR_KEY = 'DSLI';

/** Hidden escape hatch: set this key to any non-empty value in localStorage to
 * force tryRefresh even when no login indicator is present.
 * Useful for apps with storeLastAuthenticatedUser=false whose users get stuck
 * logged-out after upgrading (no DSLI written yet). Not documented intentionally. */
export const LOGGED_IN_INDICATOR_DISABLED_KEY = 'DSLI_DISABLED';
