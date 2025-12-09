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
  persistTokens,
  getIdToken,
} from './helpers';
import { CookieConfig, PersistTokensOptions } from './types';

/**
 * Persist authentication tokens in cookie/storage
 */
export const withPersistTokens =
  <T extends CreateWebSdk>(createSdk: T) =>
  <A extends CookieConfig>({
    persistTokens: isPersistTokens,
    sessionTokenViaCookie,
    refreshTokenViaCookie,
    storagePrefix,
    ...config
  }: Parameters<T>[0] & PersistTokensOptions<A>): A extends false
    ? ReturnType<T>
    : ReturnType<T> & {
        getRefreshToken: () => string;
        getSessionToken: () => string;
        getIdToken: () => string;
      } => {
    if (!isPersistTokens || !IS_BROWSER) {
      if (isPersistTokens) {
        // Storing auth tokens in local storage and cookies are a client side only capabilities
        // and will not be done when running in the server
      }
      return createSdk(config) as any;
    }

    const afterRequest: AfterRequestHook = async (req, res) => {
      const isManagementApi = /^\/v\d+\/mgmt\//.test(req.path);

      if (res?.status === 401) {
        if (!isManagementApi) {
          clearTokens(
            storagePrefix,
            sessionTokenViaCookie,
            refreshTokenViaCookie,
          );
        }
      } else {
        persistTokens(
          await getAuthInfoFromResponse(res),
          sessionTokenViaCookie,
          storagePrefix,
          refreshTokenViaCookie,
        );
      }
    };

    const sdk = createSdk(
      addHooks(config, {
        beforeRequest: beforeRequest(storagePrefix, refreshTokenViaCookie),
        afterRequest,
      }),
    );

    const wrappedSdk = wrapWith(
      sdk,
      ['logout', 'logoutAll', 'oidc.logout'],
      logoutWrapper(
        storagePrefix,
        sessionTokenViaCookie,
        refreshTokenViaCookie,
      ),
    );

    const refreshToken = () =>
      getRefreshToken(storagePrefix, refreshTokenViaCookie);
    const sessionToken = () =>
      getSessionToken(storagePrefix, sessionTokenViaCookie);
    const idToken = () => getIdToken(storagePrefix);

    return Object.assign(wrappedSdk, {
      getRefreshToken: refreshToken,
      getSessionToken: sessionToken,
      getIdToken: idToken,
    }) as any;
  };

const logoutWrapper =
  (
    prefix?: string,
    sessionTokenViaCookie?: CookieConfig,
    refreshTokenViaCookie?: CookieConfig,
  ): SdkFnWrapper<{}> =>
  (fn) =>
  async (...args) => {
    const resp = await fn(...args);

    clearTokens(prefix, sessionTokenViaCookie, refreshTokenViaCookie);

    return resp;
  };

export default withPersistTokens;
