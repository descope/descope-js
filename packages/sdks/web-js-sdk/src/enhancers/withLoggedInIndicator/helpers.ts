import { getLocalStorage } from '../helpers';
import { LOCAL_STORAGE_LAST_USER_LOGIN_ID } from '../withLastLoggedInUser/constants';
import { LOGGED_IN_INDICATOR_KEY } from './constants';

/**
 * Returns true if the browser shows any sign of an authenticated session.
 *
 * Primary signal: the DSLI key, written by `withLoggedInIndicator` after every
 * successful auth response and cleared on logout / invalid-session.
 *
 * Bootstrap fallback: the lastUser key (`dls_last_user_login_id`) written by
 * `withLastLoggedInUser`. This exists so users authenticated under a previous
 * SDK version (before DSLI existed) aren't wrongly treated as anonymous on the
 * first page load after upgrade. Once any successful auth has written DSLI,
 * the fallback is no longer load-bearing and can be dropped in a future cleanup.
 *
 * Both keys are intentionally unprefixed — `storagePrefix` is consumed by
 * `withPersistTokens` and not propagated to other enhancers.
 */
export function hasLoginIndicator(): boolean {
  return (
    !!getLocalStorage(LOGGED_IN_INDICATOR_KEY) ||
    !!getLocalStorage(LOCAL_STORAGE_LAST_USER_LOGIN_ID)
  );
}
