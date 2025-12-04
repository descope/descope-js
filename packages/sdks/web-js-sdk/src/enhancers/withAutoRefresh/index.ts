import { SdkFnWrapper, wrapWith } from '@descope/core-js-sdk';
import { CreateWebSdk } from '../../sdk';
import { AfterRequestHook } from '../../types';
import { addHooks, getAuthInfoFromResponse, isDescopeBridge } from '../helpers';
import {
  createTimerFunctions,
  getTokenExpiration,
  getAutoRefreshTimeout,
  millisecondsUntilDate,
} from './helpers';
import { AutoRefreshOptions } from './types';
import logger from '../helpers/logger';
import { IS_BROWSER, REFRESH_THRESHOLD } from '../../constants';
import { getRefreshToken } from '../withPersistTokens/helpers';

/**
 * Automatically refresh the session token before it expires
 * It uses the the refresh token that is extracted from API response to do that
 */
export const withAutoRefresh =
  <T extends CreateWebSdk>(createSdk: T) =>
  ({ autoRefresh, ...config }: Parameters<T>[0] & AutoRefreshOptions) => {
    // Never auto refresh in native flows
    if (!autoRefresh || isDescopeBridge()) return createSdk(config);

    const ignoreVisibility = autoRefresh?.['ignoreVisibility'] === true;

    // if we hold a single timer id, there might be a case where we override it before canceling the timer, this might cause many calls to refresh
    // in order to prevent it, we hold a list of timers and cancel all of them when a new timer is set, which means we should have one active timer only at a time
    const { clearAllTimers, setTimer } = createTimerFunctions();

    // we need to hold the expiration time and the refresh token in order to refresh the session
    // when the user comes back to the tab or from background/lock screen/etc.
    let sessionExpirationDate: Date;
    let refreshToken: string;

    if (IS_BROWSER) {
      document.addEventListener('visibilitychange', () => {
        const tmp = millisecondsUntilDate(sessionExpirationDate);
        // tab becomes visible and the session is expired or about to expire
        if (
          document.visibilityState === 'visible' &&
          sessionExpirationDate &&
          millisecondsUntilDate(sessionExpirationDate) <= REFRESH_THRESHOLD
        ) {
          // Session is expired or very close to expiration, refresh immediately
          logger.debug(
            'Session expired or close to expiration, refreshing session',
          );
          clearAllTimers();
          // We prefer the persisted refresh token over the one from the response
          // for a case that the token was refreshed from another tab, this mostly relevant
          // when the project uses token rotation
          sdk.refresh(getRefreshToken() || refreshToken);
        }
      });
    }

    const afterRequest: AfterRequestHook = async (_req, res) => {
      const { sessionJwt, refreshJwt, sessionExpiration } =
        await getAuthInfoFromResponse(res);

      // if we got 401 we want to cancel all timers
      if (res?.status === 401) {
        logger.debug('Received 401, canceling all timers');
        clearAllTimers();
      } else if (sessionJwt || sessionExpiration) {
        sessionExpirationDate = getTokenExpiration(
          sessionJwt,
          sessionExpiration,
        );
        if (!sessionExpirationDate) {
          logger.debug('Could not extract expiration time from session token');
          return;
        }
        refreshToken = refreshJwt;
        const timeout = getAutoRefreshTimeout(sessionExpirationDate);
        clearAllTimers();

        if (timeout <= REFRESH_THRESHOLD) {
          /*
            When receiving a session with very short expiration - it means that the refresh token is also close to expiration
            This happens because session expiration cannot be more than the refresh expiration
            In this case - the user is going to be logged out soon, so we don't want to set a refresh timer
          */
          logger.debug(
            'Session is too close to expiration, not setting refresh timer',
          );
          return;
        }

        const refreshTimeStr = new Date(
          Date.now() + timeout,
        ).toLocaleTimeString('en-US', { hour12: false });
        logger.debug(
          `Setting refresh timer for ${refreshTimeStr}. (${timeout}ms)`,
        );

        setTimer(() => {
          if (
            !ignoreVisibility &&
            IS_BROWSER &&
            document.visibilityState === 'hidden'
          ) {
            logger.debug(
              'Document hidden, skipping refresh (will refresh when visible)',
            );
          } else {
            logger.debug('Refreshing session due to timer');
            // We prefer the persisted refresh token over the one from the response
            // for a case that the token was refreshed from another tab, this mostly relevant
            // when the project uses token rotation
            sdk.refresh(getRefreshToken() || refreshJwt);
          }
        }, timeout);
      }
    };

    const sdk = createSdk(addHooks(config, { afterRequest }));

    const wrapper: SdkFnWrapper<{}> =
      (fn) =>
      async (...args) => {
        const resp = await fn(...args);
        logger.debug('Clearing all timers');
        clearAllTimers();

        return resp;
      };

    return wrapWith(sdk, ['logout', 'logoutAll', 'oidc.logout'], wrapper);
  };
