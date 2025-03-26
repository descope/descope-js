import { JWTResponse, SdkFnWrapper, wrapWith } from '@descope/core-js-sdk';
import { CreateWebSdk } from '../../sdk';
import { AfterRequestHook } from '../../types';
import { addHooks, getAuthInfoFromResponse } from '../helpers';
import logger from '../helpers/logger';
import { REFRESH_EXPIRATION } from './constants';
import { IS_BROWSER } from '../../constants';

const getRefreshExpiration = () => {
  if (!IS_BROWSER) return;

  const refreshExpiration = localStorage.getItem(REFRESH_EXPIRATION);
  if (!refreshExpiration) return;

  return parseInt(refreshExpiration);
};
/**
 * Enhancer that set the refresh expiration in the local storage
 * - set to refresh expiration when the user logs in / refreshes
 * - cleared when the user logs out or receives a 401
 */
export const withAuthState =
  <T extends CreateWebSdk>(createSdk: T) =>
  (
    config: Parameters<T>[0],
  ): ReturnType<T> & {
    getRefreshExpiration: typeof getRefreshExpiration;
  } => {
    // a hook that will set the logged in state in the local storage
    const afterRequest: AfterRequestHook = async (_req, res) => {
      // cookieExpiration is actually refresh expiration time
      // (it is returned regardless how the refresh token is sent - body or cookie)
      const { cookieExpiration } = (await getAuthInfoFromResponse(
        res,
      )) as JWTResponse;

      // if we got 401 we want to clear the logged in state
      if (res?.status === 401) {
        logger.debug('Received 401, clearing refresh expiration state');
        localStorage.removeItem(REFRESH_EXPIRATION);
      } else if (cookieExpiration) {
        // set as logged in
        localStorage.setItem(REFRESH_EXPIRATION, cookieExpiration.toString());
      }
    };

    const sdk = createSdk(addHooks(config, { afterRequest }));

    const logoutWrapper: SdkFnWrapper<{}> =
      (fn) =>
      async (...args) => {
        const resp = await fn(...args);
        if (resp.ok) {
          logger.debug('Clearing refresh expiration state on logout');
          localStorage.removeItem(REFRESH_EXPIRATION);
        }
        return resp;
      };

    const wrappedSdk = wrapWith(sdk, ['logout', 'logoutAll'], logoutWrapper);
    return Object.assign(wrappedSdk, {
      getRefreshExpiration: getRefreshExpiration,
    }) as any;
  };
