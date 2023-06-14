import { SdkFnWrapper, wrapWith } from '@descope/core-js-sdk';
import { CreateWebSdk } from '../../sdk';
import { AfterRequestHook } from '../../types';
import { addHooks, getAuthInfoFromResponse } from '../helpers';
import {
  createTimerFunctions,
  getTokenExpiration,
  millisecondsUntilDate,
} from './helpers';
import { AutoRefreshOptions } from './types';
import logger from '../helpers/logger';

// The amount of time (ms) to trigger the refresh before session expires
const REFRESH_THRESHOLD = 20 * 1000; // 20 sec

/**
 * Automatically refresh the session token before it expires
 * It uses the the refresh token that is extracted from API response to do that
 */
export const withAutoRefresh =
  <T extends CreateWebSdk>(createSdk: T) =>
  ({ autoRefresh, ...config }: Parameters<T>[0] & AutoRefreshOptions) => {
    if (!autoRefresh) return createSdk(config);

    // if we hold a single timer id, there might be a case where we override it before canceling the timer, this might cause many calls to refresh
    // in order to prevent it, we hold a list of timers and cancel all of them when a new timer is set, which means we should have one active timer only at a time
    const { clearAllTimers, setTimer } = createTimerFunctions();

    const afterRequest: AfterRequestHook = async (_req, res) => {
      const { refreshJwt, sessionJwt } = await getAuthInfoFromResponse(res);

      // if we got 401 we want to cancel all timers
      if (res?.status === 401) {
        logger.debug('Received 401, canceling all timers');
        clearAllTimers();
      } else if (sessionJwt) {
        const timeout =
          millisecondsUntilDate(getTokenExpiration(sessionJwt)) -
          REFRESH_THRESHOLD;
        clearAllTimers();
        logger.debug(`Setting refresh timer for ${timeout}ms`);
        setTimer(() => {
          logger.debug('Refreshing session');
          sdk.refresh(refreshJwt);
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

    return wrapWith(sdk, ['logout', 'logoutAll'], wrapper);
  };
