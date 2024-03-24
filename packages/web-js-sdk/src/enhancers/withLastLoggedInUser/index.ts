import { SdkFnWrapper, wrapWith } from '@descope/core-js-sdk';
import { CreateWebSdk } from '../../sdk';
import { AfterRequestHook, CoreSdk } from '../../types';
import { addHooks, getUserFromResponse } from '../helpers';
import {
  getLastUserLoginId,
  removeLastUserLoginId,
  setLastUserLoginId,
  getLastUserDisplayName,
  removeLastUserDisplayName,
  setLastUserDisplayName,
} from './helpers';

/**
 * Adds last logged in user to flow start request
 */
// eslint-disable-next-line import/exports-last
export const withLastLoggedInUser =
  <T extends CreateWebSdk>(createSdk: T) =>
  ({
    storeLastAuthenticatedUser = true,
    ...config
  }: Parameters<T>[0] & {
    storeLastAuthenticatedUser?: boolean;
  }): ReturnType<T> & {
    getLastUserLoginId: typeof getLastUserLoginId;
    getLastUserDisplayName: typeof getLastUserDisplayName;
  } => {
    if (!storeLastAuthenticatedUser) {
      // We assign getLastUserLoginId and getLastUserDisplayName to the sdk
      // To keep the return type consistent
      return Object.assign(createSdk(config), {
        getLastUserLoginId,
        getLastUserDisplayName,
      }) as any;
    }
    const afterRequest: AfterRequestHook = async (_req, res) => {
      const userDetails = await getUserFromResponse(res);
      const loginId = userDetails?.loginIds?.[0];
      const displayName = userDetails?.name;
      if (loginId) {
        setLastUserLoginId(loginId);
        setLastUserDisplayName(displayName);
      }
    };

    const sdk = createSdk(addHooks(config, { afterRequest }));

    let wrappedSdk = wrapWith(sdk, ['flow.start'], startWrapper);
    wrappedSdk = wrapWith(wrappedSdk, ['logout', 'logoutAll'], logoutWrapper);
    return Object.assign(wrappedSdk, {
      getLastUserLoginId,
      getLastUserDisplayName,
    }) as any;
  };

const startWrapper: SdkFnWrapper<{}> =
  (fn) =>
  async (...args) => {
    args[1] = args[1] || {};
    const [, options = {}] = args as unknown as Parameters<
      CoreSdk['flow']['start']
    >;
    const loginId = getLastUserLoginId();
    const displayName = getLastUserDisplayName();

    if (loginId) {
      options.lastAuth ??= {};
      options.lastAuth.loginId = loginId;
      options.lastAuth.name = displayName;
    }

    const resp = await fn(...args);

    return resp;
  };

const logoutWrapper: SdkFnWrapper<{}> =
  (fn) =>
  async (...args) => {
    const resp = await fn(...args);

    removeLastUserLoginId();
    removeLastUserDisplayName();

    return resp;
  };
