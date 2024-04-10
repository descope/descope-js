/* eslint-disable import/exports-last */
import { SdkFnWrapper, wrapWith } from '@descope/core-js-sdk';
import { IS_BROWSER } from '../../constants';
import { CreateWebSdk } from '../../sdk';
import { AfterRequestHook } from '../../types';
import { addHooks, getAuthInfoFromResponse } from '../helpers';
import {
  beforeRequest,
  clearTokens,
  getRefreshToken,
  getSessionToken,
  isTokenExpired,
  persistTokens,
} from './helpers';
import { PersistTokensOptions } from './types';

/**
 * Persist authentication tokens in cookie/storage
 */
export const withPersistTokens =
  <T extends CreateWebSdk>(createSdk: T) =>
  <A extends boolean>({
    persistTokens: isPersistTokens,
    sessionTokenViaCookie,
    storagePrefix,
    ...config
  }: Parameters<T>[0] & PersistTokensOptions<A>): A extends true
    ? ReturnType<T> & {
        getRefreshToken: () => string;
        getSessionToken: () => string;
        isRefreshTokenExpired: () => boolean;
        isSessionTokenExpired: () => boolean;
      }
    : ReturnType<T> => {
    if (!isPersistTokens || !IS_BROWSER) {
      if (isPersistTokens) {
        // eslint-disable-next-line no-console
        console.warn(
          'Storing auth tokens in local storage and cookies are a client side only capabilities and will not be done when running in the server'
        );
      }
      return createSdk(config) as any;
    }

    const afterRequest: AfterRequestHook = async (_req, res) => {
      if (res?.status === 401) {
        clearTokens(storagePrefix);
      } else {
        persistTokens(
          await getAuthInfoFromResponse(res),
          sessionTokenViaCookie,
          storagePrefix
        );
      }
    };

    const sdk = createSdk(
      addHooks(config, {
        beforeRequest: beforeRequest(storagePrefix),
        afterRequest,
      })
    );

    const wrappedSdk = wrapWith(
      sdk,
      ['logout', 'logoutAll'],
      wrapper(storagePrefix)
    );

    const refreshToken = () => getRefreshToken(storagePrefix);
    const sessionToken = () => getSessionToken(storagePrefix);
    const isRefreshTokenExpired = () => isTokenExpired(refreshToken());
    const isSessionTokenExpired = () => isTokenExpired(sessionToken());

    return Object.assign(wrappedSdk, {
      getRefreshToken: refreshToken,
      getSessionToken: sessionToken,
      isRefreshTokenExpired,
      isSessionTokenExpired,
    }) as any;
  };

const wrapper =
  (prefix?: string): SdkFnWrapper<{}> =>
  (fn) =>
  async (...args) => {
    const resp = await fn(...args);

    clearTokens(prefix);

    return resp;
  };

export default withPersistTokens;
