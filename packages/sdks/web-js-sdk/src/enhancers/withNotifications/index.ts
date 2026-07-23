import {
  Claims,
  SdkFnWrapper,
  UserResponse,
  wrapWith,
} from '@descope/core-js-sdk';
import { CreateWebSdk, WebSdk } from '../../sdk';
import { AfterRequestHook } from '../../types';
import {
  addHooks,
  getAuthInfoFromResponse,
  getUserFromResponse,
  isInvalidSessionResponse,
} from '../helpers';
import { createPubSub } from './helpers';
import logger from '../helpers/logger';

/**
 * Adds 4 event functions to the sdk,
 * onSessionTokenChange: Gets a callback and call it whenever there is a change in session token
 * onIsAuthenticatedChange: Gets a callback and call it whenever there is a change in authentication status
 * onUserChange: Gets a callback and call it whenever there is a change in current logged in user
 * onClaimsChange: Gets a callback and call it whenever there is a change in the JWT claims
 */
export const withNotifications =
  <T extends CreateWebSdk>(createSdk: T) =>
  (config: Parameters<T>[0]) => {
    const sessionExpirationPS = createPubSub<number | null>();
    const sessionPS = createPubSub<string | null>();
    const userPS = createPubSub<UserResponse | null>();
    const claimsPS = createPubSub<Claims | null>();

    const afterRequest: AfterRequestHook = async (req, res) => {
      if (isInvalidSessionResponse(req, res)) {
        logger.debug(
          'Session invalidated, notifying subscribers with empty values',
        );
        sessionPS.pub(null);
        userPS.pub(null);
        sessionExpirationPS.pub(null);
        claimsPS.pub(null);
      } else {
        const userDetails = await getUserFromResponse(res);
        if (userDetails) userPS.pub(userDetails);

        const { sessionJwt, sessionExpiration, claims } =
          await getAuthInfoFromResponse(res);

        if (sessionJwt) sessionPS.pub(sessionJwt);
        if (claims) claimsPS.pub(claims);

        if (sessionExpiration || sessionJwt) {
          // We also publish the session expiration if there is a session jwt
          // as a temporary fix for the issue where the session expiration is not
          // being sent in the response in Flows (42 is a magic number)
          sessionExpirationPS.pub(sessionExpiration || 42);
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
        claimsPS.pub(null);

        return resp;
      };

    const wrappedSdk = wrapWith(
      sdk,
      ['logout', 'logoutAll', 'oidc.logout'],
      wrapper,
    );

    return Object.assign(wrappedSdk, {
      onSessionTokenChange: sessionPS.sub,
      onUserChange: userPS.sub,
      onClaimsChange: claimsPS.sub,
      onIsAuthenticatedChange: (cb: (isAuthenticated: boolean) => void) => {
        // If and only if there is a session expiration, then the user is authenticated
        return sessionExpirationPS.sub((exp) => {
          cb(!!exp);
        });
      },
    });
  };
