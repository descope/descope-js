import { SdkFnWrapper, wrapWith } from '@descope/core-js-sdk';
import { CreateWebSdk } from '../../sdk';
import { AfterRequestHook } from '../../types';
import {
  addHooks,
  getAuthInfoFromResponse,
  isDescopeBridge,
  isInvalidSessionResponse,
} from '../helpers';
import {
  createTimerFunctions,
  getTokenExpiration,
  getAutoRefreshTimeout,
  isActivityRefreshEnabled,
  createActivityTracker,
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

    // if we hold a single timer id, there might be a case where we override it before canceling the timer, this might cause many calls to refresh
    // in order to prevent it, we hold a list of timers and cancel all of them when a new timer is set, which means we should have one active timer only at a time
    const { clearAllTimers, setTimer } = createTimerFunctions();

    // Activity tracking state (opt-in via localStorage)
    const activityTrackingEnabled = isActivityRefreshEnabled();
    let activityTracker: ReturnType<typeof createActivityTracker> | null = null;

    if (activityTrackingEnabled) {
      logger.debug('Activity-based refresh enabled');
      activityTracker = createActivityTracker(logger);
      activityTracker.attachListeners();
    }

    // we need to hold the expiration time and the refresh token in order to refresh the session
    // when the user comes back to the tab or from background/lock screen/etc.
    let sessionExpirationDate: Date;
    let refreshToken: string;
    if (IS_BROWSER) {
      document.addEventListener('visibilitychange', () => {
        // tab becomes visible
        if (document.visibilityState === 'visible') {
          // Mark as active when tab becomes visible (user is switching to this tab)
          if (activityTracker) {
            activityTracker.markActive();
          }

          // session is expired, do a refresh
          if (sessionExpirationDate && new Date() > sessionExpirationDate) {
            logger.debug('Expiration time passed, refreshing session');
            // We prefer the persisted refresh token over the one from the response
            // for a case that the token was refreshed from another tab, this mostly relevant
            // when the project uses token rotation
            sdk.refresh(getRefreshToken() || refreshToken);
          }
        }
      });
    }

    const afterRequest: AfterRequestHook = async (req, res) => {
      const { sessionJwt, refreshJwt, sessionExpiration, nextRefreshSeconds } =
        await getAuthInfoFromResponse(res);

      // if we got a failed response on a session validation route we want to cancel all timers
      if (isInvalidSessionResponse(req, res)) {
        logger.debug('Session invalidated, canceling all timers');
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
        const timeout = getAutoRefreshTimeout(
          sessionExpirationDate,
          nextRefreshSeconds,
        );
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

        // Reset activity tracking after receiving new session (refresh succeeded)
        if (activityTracker) {
          activityTracker.resetActivity();
        }

        setTimer(() => {
          // Skip refresh if document is hidden - the visibilitychange handler will refresh when user returns
          if (IS_BROWSER && document.visibilityState === 'hidden') {
            logger.debug('Skipping refresh due to timer - document is hidden');
            return;
          }

          // Check activity if tracking is enabled
          if (activityTracker && !activityTracker.hadActivity()) {
            logger.debug('Skipping refresh due to timer - user is idle');
            return; // Don't reschedule - wait for activity or visibility change
          }

          logger.debug('Refreshing session due to timer');
          // We prefer the persisted refresh token over the one from the response
          // for a case that the token was refreshed from another tab, this mostly relevant
          // when the project uses token rotation
          sdk.refresh(getRefreshToken() || refreshJwt);
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
        // Cleanup activity listeners on logout
        if (activityTracker) {
          activityTracker.detachListeners();
        }

        return resp;
      };

    return wrapWith(sdk, ['logout', 'logoutAll', 'oidc.logout'], wrapper);
  };
