import { JWTResponse, UserResponse } from '@descope/core-js-sdk';
import { CoreSdkConfig } from '../../types';

/**
 * Add hooks to an existing core-sdk config
 */
export const addHooks = <Config extends CoreSdkConfig>(
  config: Config,
  hooks: Config['hooks']
): Config => {
  ['beforeRequest', 'afterRequest'].reduce((acc, key) => {
    acc[key] = [].concat(config.hooks?.[key] || []).concat(hooks?.[key] || []);

    return acc;
  }, (config.hooks ??= {}));

  return config;
};

export { compose } from './compose';

/**
 * Extract auth info (JWT response) from fetch response
 * We assume that the auth info is under a "authInfo" attribute (flow response)
 * Or the body itself (other auth methods response)
 */
export const getAuthInfoFromResponse = async (
  res: Response
): Promise<Partial<JWTResponse>> => {
  if (!res?.ok) return {};
  const body = await res?.clone().json();
  return body?.authInfo || body || {};
};

/**
 * Extract user from fetch response
 * User my exist under "user" attribute (auth methods response)
 * Or the body itself (when calling "me")
 */
export const getUserFromResponse = async (
  res: Response
): Promise<UserResponse> | undefined => {
  const authInfo = await getAuthInfoFromResponse(res);

  return (
    authInfo?.user ||
    (authInfo?.hasOwnProperty('userId')
      ? (authInfo as UserResponse)
      : undefined)
  );
};

export const isLocalStorage = typeof localStorage !== 'undefined';

export const setLocalStorage = (key: string, value: string) =>
  isLocalStorage && localStorage?.setItem(key, value);
export const getLocalStorage = (key: string) =>
  isLocalStorage && localStorage?.getItem(key);
export const removeLocalStorage = (key: string) =>
  isLocalStorage && localStorage?.removeItem(key);
