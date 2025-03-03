import { SdkFnWrapper, UserResponse, wrapWith } from '@descope/core-js-sdk';
import { CreateWebSdk, WebSdk } from '../../sdk';
import { AfterRequestHook } from '../../types';
import {
  addHooks,
  getAuthInfoFromResponse,
  getUserFromResponse,
} from '../helpers';
import { createPubSub } from './helpers';

/**
 * Adds 3 event functions to the sdk,
 * onSessionTokenChange: Gets a callback and call it whenever there is a change in session token
 * onIsAuthenticatedChange: Gets a callback and call it whenever there is a change in authentication status
 * onUserChange: Gets a callback and call it whenever there is a change in current logged in user
 */
export const withNotifications =
  <T extends CreateWebSdk>(createSdk: T) =>
  (config: Parameters<T>[0]) => {
    const sessionExpirationPS = createPubSub<number | null>();
    const sessionPS = createPubSub<string | null>();
    const userPS = createPubSub<UserResponse | null>();

    const afterRequest: AfterRequestHook = async (_req, res) => {
      if (res?.status === 401) {
        sessionPS.pub(null);
        userPS.pub(null);
        sessionExpirationPS.pub(null);
      } else {
        const userDetails = await getUserFromResponse(res);
        if (userDetails) userPS.pub(userDetails);

        const { sessionJwt, sessionExpiration } =
          await getAuthInfoFromResponse(res);
        if (sessionJwt) sessionPS.pub(sessionJwt);

        if (sessionExpiration) {
          sessionExpirationPS.pub(sessionExpiration);
        }
      }
    };

    const sdk = createSdk(addHooks(config, { afterRequest }));

    const wrapper: SdkFnWrapper<{}> =
      (fn) =>
      async (...args) => {
        const resp = await fn(...args);

        sessionPS.pub(null);
        userPS.pub(null);
        sessionExpirationPS.pub(null);

        return resp;
      };

    const wrappedSdk = wrapWith(sdk, ['logout', 'logoutAll'], wrapper);

    return Object.assign(wrappedSdk, {
      onSessionTokenChange: sessionPS.sub,
      onUserChange: userPS.sub,
      onIsAuthenticatedChange: (cb: (isAuthenticated: boolean) => void) => {
        // If and only if there is a session expiration, then the user is authenticated
        return sessionExpirationPS.sub((exp) => {
          cb(!!exp);
        });
      },
    });
  };
