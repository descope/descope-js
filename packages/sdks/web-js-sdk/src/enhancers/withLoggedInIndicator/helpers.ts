import { getInternalStorage, getLocalStorage } from '../helpers';
import { LOCAL_STORAGE_LAST_USER_LOGIN_ID } from '../withLastLoggedInUser/constants';
import { LOGGED_IN_INDICATOR_KEY } from './constants';

/**
 * Returns true if the browser shows any sign of an authenticated session.
 *
 * Primary signal: the DSLI key, written by `withLoggedInIndicator` after every
 * successful auth response and cleared on logout / invalid-session. It is read
 * from real `localStorage` (not `customStorage`) so the skip decision stays
 * correct when the app routes token storage elsewhere (sessionStorage, etc).
 *
 * Bootstrap fallback: the lastUser key (`dls_last_user_login_id`) written by
 * `withLastLoggedInUser`. This exists so users authenticated under a previous
 * SDK version (before DSLI existed) aren't wrongly treated as anonymous on the
 * first page load after upgrade. It stays on `customStorage` (it may hold PII,
 * so it must not move to localStorage), which also lets it recognize a returning
 * user during the transition before DSLI has been written to real localStorage.
 * Once any successful auth has written DSLI, the fallback is no longer
 * load-bearing and can be dropped in a future cleanup.
 *
 * Both keys are intentionally unprefixed — `storagePrefix` is consumed by
 * `withPersistTokens` and not propagated to other enhancers.
 */
export function hasLoginIndicator(): boolean {
  return (
    !!getInternalStorage(LOGGED_IN_INDICATOR_KEY) ||
    !!getLocalStorage(LOCAL_STORAGE_LAST_USER_LOGIN_ID)
  );
}
