/* eslint-disable import/exports-last */
import { SdkFnWrapper, wrapWith } from '@descope/core-js-sdk';
import { IS_BROWSER } from '../../constants';
import { CreateWebSdk } from '../../sdk';
import { AfterRequestHook } from '../../types';
import {
  addHooks,
  getAuthInfoFromResponse,
  isInvalidSessionResponse,
  setLocalStorage,
  removeLocalStorage,
} from '../helpers';
import {
  beforeRequest,
  clearTokens,
  getRefreshToken,
  getSessionToken,
  persistTokens,
  getIdToken,
} from './helpers';
import { REFRESH_COOKIE_NAME_KEY } from './constants';
import { CookieConfig, LastCookieOptions, PersistTokensOptions } from './types';
import logger from '../helpers/logger';

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
    refreshCookieName,
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
      return createSdk({ refreshCookieName, ...config }) as any;
    }

    // Cache to store the cookie options that were used when setting the cookie
    // This allows us to use the exact same options when removing the cookie
    let lastCookieOptions: LastCookieOptions | undefined;

    const afterRequest: AfterRequestHook = async (req, res) => {
      if (isInvalidSessionResponse(req, res)) {
        logger.debug('Session invalidated, clearing persisted tokens');
        clearTokens(
          storagePrefix,
          sessionTokenViaCookie,
          refreshTokenViaCookie,
          lastCookieOptions,
          config.projectId,
        );
      } else {
        const authInfo = await getAuthInfoFromResponse(res);

        // Persist or clear server-returned refresh cookie name based on auth response
        if (authInfo.cookieName) {
          setLocalStorage(
            `${storagePrefix || ''}${REFRESH_COOKIE_NAME_KEY}`,
            authInfo.cookieName,
          );
        } else if (authInfo.refreshJwt) {
          // Auth response issued a new refresh token but no custom cookie name —
          // clear any stale value so we don't keep sending an outdated name
          removeLocalStorage(
            `${storagePrefix || ''}${REFRESH_COOKIE_NAME_KEY}`,
          );
        }

        const newCookieOptions = persistTokens(
          authInfo,
          sessionTokenViaCookie,
          storagePrefix,
          refreshTokenViaCookie,
          (config as any).projectId,
        );
        // Only update lastCookieOptions if we actually set a cookie
        if (newCookieOptions) {
          lastCookieOptions = newCookieOptions;
        }
      }
    };

    const sdk = createSdk(
      addHooks(
        { refreshCookieName, ...config },
        {
          beforeRequest: beforeRequest(
            storagePrefix,
            refreshTokenViaCookie,
            refreshCookieName,
          ),
          afterRequest,
        },
      ),
    );

    const wrappedSdk = wrapWith(
      sdk,
      ['logout', 'logoutAll', 'oidc.logout'],
      logoutWrapper(
        storagePrefix,
        sessionTokenViaCookie,
        refreshTokenViaCookie,
        () => lastCookieOptions,
        (config as any).projectId,
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
    getCookieOptions?: () => LastCookieOptions | undefined,
    projectId?: string,
  ): SdkFnWrapper<{}> =>
  (fn) =>
  async (...args) => {
    const resp = await fn(...args);

    clearTokens(
      prefix,
      sessionTokenViaCookie,
      refreshTokenViaCookie,
      getCookieOptions?.(),
      projectId,
    );

    return resp;
  };

export default withPersistTokens;
