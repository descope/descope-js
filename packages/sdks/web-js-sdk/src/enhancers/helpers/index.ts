import { JWTResponse, UserResponse } from '@descope/core-js-sdk';
import {
  CoreSdkConfig,
  CustomStorage,
  WebJWTResponse,
  WebSigninResponse,
} from '../../types';
import { jwtDecode, JwtPayload } from 'jwt-decode';

// this is a singleton
// but in order to keep the code clean
// it was implemented in this way
let customStorage: CustomStorage | undefined;

const getExpirationFromToken = (token: string) => {
  try {
    const claims = jwtDecode<JwtPayload>(token);
    return claims.exp;
  } catch (e) {
    return null;
  }
};

const oidcRefreshTokenExpiration = (response: WebSigninResponse) => {
  const { refresh_expire_in, refresh_token } = response;
  if (refresh_expire_in) {
    return Math.floor(Date.now() / 1000) + refresh_expire_in;
  }
  return getExpirationFromToken(refresh_token);
};

const oidcAccessTokenExpiration = (response: WebSigninResponse) => {
  // oidc-client-ts may return the expiration time in
  // - the expires_at (timestamp in seconds)
  // - the expires_in (ttl in seconds)
  // - we also fallback to the token itself
  const { expires_in, expires_at, access_token } = response;
  if (expires_at) {
    return expires_at;
  }
  if (expires_in) {
    // get expiration time from the expires_in in seconds
    return Math.floor(Date.now() / 1000) + expires_in;
  }
  if (access_token) {
    // get expiration time from the token itself
    return getExpirationFromToken(access_token);
  }
  return undefined;
};

const normalizeWebJWTResponseToJWTResponse = (
  response: WebSigninResponse,
): WebJWTResponse => {
  const { access_token, id_token, refresh_token, refresh_expire_in, ...rest } =
    response;
  return {
    sessionJwt: response.sessionJwt || access_token,
    idToken: id_token,
    refreshJwt: response.refreshJwt || refresh_token,
    sessionExpiration:
      response.sessionExpiration || oidcAccessTokenExpiration(response),
    cookieExpiration:
      response.cookieExpiration ||
      (oidcRefreshTokenExpiration(response) as number),
    ...rest,
  };
};

/**
 * Add hooks to an existing core-sdk config
 */
export const addHooks = <Config extends CoreSdkConfig>(
  config: Config,
  hooks: Config['hooks'],
): Config => {
  ['beforeRequest', 'afterRequest'].reduce(
    (acc, key) => {
      acc[key] = []
        .concat(config.hooks?.[key] || [])
        .concat(hooks?.[key] || []);

      return acc;
    },
    (config.hooks ??= {}),
  );

  return config;
};

export { compose } from './compose';

/**
 * Extract auth info (JWT response) from fetch response
 * We assume that the auth info is under a "authInfo" attribute (flow response)
 * Or the body itself (other auth methods response)
 */
export const getAuthInfoFromResponse = async (
  res: Response,
): Promise<Partial<WebJWTResponse>> => {
  if (!res?.ok) return {};
  const body = await res?.clone().json();
  const authInfo = body?.authInfo || body || ({} as Partial<WebJWTResponse>);
  return normalizeWebJWTResponseToJWTResponse(authInfo);
};

export const getUserAndLastAuthFromResponse = async (
  res: Response,
): Promise<{ userInfo: UserResponse | undefined; lastAuth: any }> => {
  if (!res?.ok) {
    return { userInfo: undefined, lastAuth: undefined };
  }
  const body = await res?.clone().json();
  const authInfo: Partial<WebJWTResponse> =
    normalizeWebJWTResponseToJWTResponse(
      body?.authInfo || body || ({} as Partial<WebJWTResponse>),
    );
  const userInfo =
    authInfo?.user ||
    (authInfo?.hasOwnProperty('userId')
      ? (authInfo as UserResponse)
      : undefined);
  return {
    userInfo,
    lastAuth: body.lastAuth,
  };
};

/**
 * Extract user from fetch response
 * User my exist under "user" attribute (auth methods response)
 * Or the body itself (when calling "me")
 */
export const getUserFromResponse = async (
  res: Response,
): Promise<UserResponse> | undefined => {
  const authInfo = await getAuthInfoFromResponse(res);

  return (
    authInfo?.user ||
    (authInfo?.hasOwnProperty('userId')
      ? (authInfo as UserResponse)
      : undefined)
  );
};

// This window flag is set by mobile frameworks
export const isDescopeBridge = () =>
  typeof window !== 'undefined' && !!window['descopeBridge'];

export const isLocalStorage =
  typeof customStorage !== 'undefined' || typeof localStorage !== 'undefined';

export const setLocalStorage = (key: string, value: string) =>
  (customStorage || localStorage)?.setItem?.(key, value);
export const getLocalStorage = (key: string) =>
  (customStorage || localStorage)?.getItem?.(key);
export const removeLocalStorage = (key: string) =>
  (customStorage || localStorage)?.removeItem?.(key);
export const getLocalStorageLength = (): number =>
  (customStorage as any)?.length ?? localStorage?.length ?? 0;
export const getLocalStorageKey = (index: number): string | null =>
  (customStorage as any)?.key?.(index) ?? localStorage?.key?.(index) ?? null;

export const setCustomStorage = (storage: CustomStorage) => {
  customStorage = storage;
};
