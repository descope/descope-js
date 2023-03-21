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
    ...config
  }: Parameters<T>[0] & PersistTokensOptions<A>): A extends true
    ? ReturnType<T> & {
        getRefreshToken: typeof getRefreshToken;
        getSessionToken: typeof getSessionToken;
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
        clearTokens();
      } else {
        persistTokens(
          await getAuthInfoFromResponse(res),
          sessionTokenViaCookie
        );
      }
    };

    const sdk = createSdk(addHooks(config, { beforeRequest, afterRequest }));

    const wrappedSdk = wrapWith(sdk, ['logout', 'logoutAll'], wrapper);

    return Object.assign(wrappedSdk, {
      getRefreshToken,
      getSessionToken,
    }) as any;
  };

const wrapper: SdkFnWrapper<{}> =
  (fn) =>
  async (...args) => {
    const resp = await fn(...args);

    clearTokens();

    return resp;
  };

export default withPersistTokens;
