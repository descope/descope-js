import { JWTResponse, SdkFnWrapper, SdkResponse, wrapWith } from '@descope/core-js-sdk';
import { CreateWebSdk } from '../../sdk';
import { AfterRequestHook } from '../../types';
import { addHooks, getAuthInfoFromResponse } from '../helpers';
import logger from '../helpers/logger';
import { REFRESH_ERROR_USER_NOT_LOGGED_IN } from '../../constants';
import { LOGGED_IN_KEY } from './constants';
import { getSessionToken } from '../withPersistTokens/helpers';

const isEmptyObject = (obj: Object) => obj && Object.keys(obj).length === 0;

/**
 * Enhancer that overrides the refresh method to only refresh if the user is logged in
 * This is done by maintaining a logged in state in the local storage that is
 * - set to true when the user logs in
 * - cleared when the user logs out or receives a 401
*/
export const withConditionalRefresh =
  <T extends CreateWebSdk>(createSdk: T) =>
  (config: Parameters<T>[0]) => {
    // a hook that will set the logged in state in the local storage
    const afterRequest: AfterRequestHook = async (_req, res) => {
      const authInfo = (await getAuthInfoFromResponse(res)) as JWTResponse;

      // if we got 401 we want to clear the logged in state
      if (res?.status === 401) {
        logger.debug('Received 401, clearing logged in state');
        localStorage.removeItem(LOGGED_IN_KEY);
      } else if (!isEmptyObject(authInfo)) {
        // set as logged in
        localStorage.setItem(LOGGED_IN_KEY, 'true');
      }
    };

    const sdk = createSdk(addHooks(config, { afterRequest }));

    const logoutWrapper: SdkFnWrapper<{}> =
      (fn) =>
      async (...args) => {
        const resp = await fn(...args);
        if (resp.ok) {
          logger.debug('Clearing logged in state');
          localStorage.removeItem(LOGGED_IN_KEY);
        }
        return resp;
      };

    const sdkRes = wrapWith(sdk, ['logout', 'logoutAll'], logoutWrapper);

    return {
      ...sdkRes,
      refresh: (token?: string , onlyIfLoggedIn?: boolean) => {
        // get the session expiration from the local storage
        // we fallback to getSessionToken to reduce the likelihood of a refresh loop
        const loggedIn = localStorage.getItem(LOGGED_IN_KEY) || getSessionToken();

        let res: Promise<SdkResponse<JWTResponse>>
       if (!loggedIn && onlyIfLoggedIn) {
          logger.debug('Not logged in, skipping refresh');
          res = Promise.resolve({ ok: false, error: {
            errorCode : REFRESH_ERROR_USER_NOT_LOGGED_IN,
            errorDescription: 'Did not refresh token because user is not logged in'
          }});
        } else {
          res = sdkRes.refresh(token);
        }
        return res;
      },
    };
  };
