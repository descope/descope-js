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
 * Adds 2 event functions to the sdk,
 * onSessionTokenChange: Gets a callback and call it whenever there is a change in session token
 * onUserChange: Gets a callback and call it whenever there is a change in current logged in user
 */
export const withNotifications =
  <T extends CreateWebSdk>(createSdk: T) =>
  (config: Parameters<T>[0]) => {
    const sessionPS = createPubSub<string | null>();
    const userPS = createPubSub<UserResponse | null>();

    const afterRequest: AfterRequestHook = async (_req, res) => {
      if (res?.status === 401) {
        sessionPS.pub(null);
        userPS.pub(null);
      } else {
        const userDetails = await getUserFromResponse(res);
        if (userDetails) userPS.pub(userDetails);

        const { sessionJwt } = await getAuthInfoFromResponse(res);
        if (sessionJwt) sessionPS.pub(sessionJwt);
      }
    };

    const sdk = createSdk(addHooks(config, { afterRequest }));

    const wrapper: SdkFnWrapper<{}> =
      (fn) =>
      async (...args) => {
        const resp = await fn(...args);

        sessionPS.pub(null);
        userPS.pub(null);

        return resp;
      };

    const wrappedSdk = wrapWith(sdk, ['logout', 'logoutAll'], wrapper);

    return Object.assign(wrappedSdk, {
      onSessionTokenChange: sessionPS.sub,
      onUserChange: userPS.sub,
    });
  };
