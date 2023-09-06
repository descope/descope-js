import { JWTResponse } from '@descope/core-js-sdk';
import Cookies from 'js-cookie';
import { BeforeRequestHook } from '../../types';
import { REFRESH_TOKEN_KEY, SESSION_TOKEN_KEY } from './constants';
import {
  getLocalStorage,
  removeLocalStorage,
  setLocalStorage,
} from '../helpers';

/**
 * Store the session JWT as a cookie on the given domain and path with the given expiration.
 * This is useful so that the application backend will automatically get the cookie for the session
 * @param name cookie name
 * @param value The JWT to store as a cookie
 * @param cookieParams configuration that is usually returned from the JWT
 */
function setJwtTokenCookie(
  name: string,
  value: string,
  { cookiePath, cookieDomain, cookieExpiration }: Partial<JWTResponse>
) {
  if (value) {
    const expires = new Date(cookieExpiration * 1000); // we are getting response from the server in seconds instead of ms
    Cookies.set(name, value, {
      path: cookiePath,
      domain: cookieDomain,
      expires,
      sameSite: 'Strict',
      secure: true,
    });
  }
}

export const persistTokens = (
  { refreshJwt, sessionJwt, ...cookieParams } = {} as Partial<JWTResponse>,
  sessionTokenViaCookie = false,
  storagePrefix = ''
) => {
  // persist refresh token
  refreshJwt &&
    setLocalStorage(`${storagePrefix}${REFRESH_TOKEN_KEY}`, refreshJwt);

  // persist session token
  if (sessionJwt) {
    sessionTokenViaCookie
      ? setJwtTokenCookie(SESSION_TOKEN_KEY, sessionJwt, cookieParams)
      : setLocalStorage(`${storagePrefix}${SESSION_TOKEN_KEY}`, sessionJwt);
  }
};

/** Return the refresh token from the localStorage. Not for production usage because refresh token will not be saved in localStorage. */
export function getRefreshToken(prefix: string = '') {
  return getLocalStorage(`${prefix}${REFRESH_TOKEN_KEY}`) || '';
}

/**
 * Return the session token. first try to get from cookie, and fallback to local storage
 * See sessionTokenViaCookie option for more details about session token location
 */
export function getSessionToken(prefix: string = ''): string {
  return (
    Cookies.get(SESSION_TOKEN_KEY) ||
    getLocalStorage(`${prefix}${SESSION_TOKEN_KEY}`) ||
    ''
  );
}

/** Remove both the localStorage refresh JWT and the session cookie */
export function clearTokens(prefix: string = '') {
  removeLocalStorage(`${prefix}${REFRESH_TOKEN_KEY}`);
  removeLocalStorage(`${prefix}${SESSION_TOKEN_KEY}`);
  Cookies.remove(SESSION_TOKEN_KEY);
}

export const beforeRequest =
  (prefix?: string): BeforeRequestHook =>
  (config) =>
    Object.assign(config, { token: config.token || getRefreshToken(prefix) });
