import { JWTResponse } from '@descope/core-js-sdk';
import Cookies from 'js-cookie';
import { BeforeRequestHook, WebJWTResponse } from '../../types';
import {
  ID_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  SESSION_TOKEN_KEY,
} from './constants';
import {
  getLocalStorage,
  removeLocalStorage,
  setLocalStorage,
} from '../helpers';
import { CookieConfig, SameSite } from './types';

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
  authInfo: Partial<
    WebJWTResponse & { cookieSameSite: SameSite; cookieSecure: boolean }
  >,
) {
  if (value) {
    const {
      cookieDomain,
      cookiePath,
      cookieSameSite,
      cookieExpiration,
      cookieSecure,
    } = authInfo;
    const expires = new Date(cookieExpiration * 1000); // we are getting response from the server in seconds instead of ms
    // Since its a JS cookie, we don't set the domain because we want the cookie to be on the same domain as the application
    const domainMatches = isCurrentDomainOrParentDomain(cookieDomain);
    Cookies.set(name, value, {
      path: cookiePath,
      domain: domainMatches ? cookieDomain : undefined,
      expires,
      sameSite: cookieSameSite,
      secure: cookieSecure,
    });
  }
}

/*
 * Check if the cookie domain is the same as the current domain or the parent domain
 * Examples:
 * 1. cookie domain: 'example.com', current domain: 'example.com' => true
 * 2. cookie domain: 'example.com', current domain: 'sub.example.com' => true
 * 3. cookie domain: 'example.com', current domain: 'sub.sub.example.com' => true
 * 4. cookie domain: 'example.com', current domain: 'another.com' => false
 * 5. cookie domain: 'example.com', current domain: 'example.co.il' => false
 */
function isCurrentDomainOrParentDomain(cookieDomain: string): boolean {
  const currentDomain = window.location.hostname;
  const currentDomainParts = currentDomain.split('.');
  const cookieDomainParts = cookieDomain?.split('.');

  // check if the cookie domain items are the last items in the current domain
  const currentDomainSuffix = currentDomainParts
    .slice(-cookieDomainParts?.length)
    .join('.');
  return currentDomainSuffix === cookieDomain;
}

const getSessionCookieName = (sessionTokenViaCookie?: CookieConfig) => {
  return sessionTokenViaCookie?.['cookieName'] || SESSION_TOKEN_KEY;
};

const getRefreshCookieName = (refreshTokenViaCookie?: CookieConfig) => {
  return refreshTokenViaCookie?.['cookieName'] || REFRESH_TOKEN_KEY;
};

export const persistTokens = (
  authInfo = {} as Partial<WebJWTResponse>,
  sessionTokenViaCookie: boolean | CookieConfig = false,
  storagePrefix = '',
  refreshTokenViaCookie: boolean | CookieConfig = false,
): { domain?: string; path?: string } | undefined => {
  // persist refresh token
  const { sessionJwt, refreshJwt } = authInfo;
  if (refreshJwt) {
    if (refreshTokenViaCookie) {
      // clear local storage refresh token if exists
      removeLocalStorage(`${storagePrefix}${REFRESH_TOKEN_KEY}`);
      // Cookie configs will fallback to default values in both cases
      // 1. refreshTokenViaCookie is a boolean
      // 2. refreshTokenViaCookie is an object without the property
      const cookieSameSite = refreshTokenViaCookie['sameSite'] || 'Strict';
      const cookieSecure = refreshTokenViaCookie['secure'] ?? true;
      const cookieDomain =
        refreshTokenViaCookie['domain'] ?? authInfo.cookieDomain;
      const cookieName = getRefreshCookieName(refreshTokenViaCookie);
      setJwtTokenCookie(cookieName, refreshJwt, {
        ...(authInfo as Partial<JWTResponse>),
        cookieSameSite,
        cookieSecure,
        cookieDomain,
      });
    } else {
      // remove refresh token from cookie if exists
      const refreshCookieName = getRefreshCookieName(refreshTokenViaCookie);
      Cookies.remove(refreshCookieName);
      // persist in local storage
      setLocalStorage(`${storagePrefix}${REFRESH_TOKEN_KEY}`, refreshJwt);
    }
  }

  let cookieOptions: { domain?: string; path?: string } | undefined;

  // persist session token
  if (sessionJwt) {
    if (sessionTokenViaCookie) {
      // Cookie configs will fallback to default values in both cases
      // 1. sessionTokenViaCookie is a boolean
      // 2. sessionTokenViaCookie is an object without the property
      const cookieSameSite = sessionTokenViaCookie['sameSite'] || 'Strict';
      const cookieSecure = sessionTokenViaCookie['secure'] ?? true;
      const cookieDomain =
        sessionTokenViaCookie['domain'] ?? authInfo.cookieDomain;
      const cookieName = getSessionCookieName(sessionTokenViaCookie);
      const authInfoWithCookie = {
        ...(authInfo as Partial<JWTResponse>),
        cookieSameSite,
        cookieSecure,
        cookieDomain,
      };
      setJwtTokenCookie(cookieName, sessionJwt, authInfoWithCookie);

      // Cache the cookie options that were actually used
      const domainMatches = isCurrentDomainOrParentDomain(cookieDomain);
      cookieOptions = {
        path: authInfoWithCookie.cookiePath,
        domain: domainMatches ? cookieDomain : undefined,
      };
    } else {
      setLocalStorage(`${storagePrefix}${SESSION_TOKEN_KEY}`, sessionJwt);
    }
  }

  if (authInfo.idToken) {
    setLocalStorage(`${storagePrefix}${ID_TOKEN_KEY}`, authInfo.idToken);
  }

  return cookieOptions;
};

/** Return the refresh token from cookie or localStorage */
export function getRefreshToken(
  prefix: string = '',
  refreshTokenViaCookie?: CookieConfig,
) {
  return (
    Cookies.get(getRefreshCookieName(refreshTokenViaCookie)) ||
    getLocalStorage(`${prefix}${REFRESH_TOKEN_KEY}`) ||
    ''
  );
}

/**
 * Return the session token. first try to get from cookie, and fallback to local storage
 * See sessionTokenViaCookie option for more details about session token location
 */
export function getSessionToken(
  prefix: string = '',
  sessionTokenViaCookie?: CookieConfig,
): string {
  return (
    Cookies.get(getSessionCookieName(sessionTokenViaCookie)) ||
    getLocalStorage(`${prefix}${SESSION_TOKEN_KEY}`) ||
    ''
  );
}

export function getIdToken(prefix: string = ''): string {
  return getLocalStorage(`${prefix}${ID_TOKEN_KEY}`) || '';
}

/** Remove both the localStorage refresh JWT and the session cookie */
export function clearTokens(
  prefix: string = '',
  sessionTokenViaCookie?: CookieConfig,
  refreshTokenViaCookie?: CookieConfig,
  cookieOptions?: { domain?: string; path?: string },
) {
  removeLocalStorage(`${prefix}${REFRESH_TOKEN_KEY}`);
  removeLocalStorage(`${prefix}${SESSION_TOKEN_KEY}`);
  removeLocalStorage(`${prefix}${ID_TOKEN_KEY}`);
  const sessionCookieName = getSessionCookieName(sessionTokenViaCookie);
  Cookies.remove(sessionCookieName, cookieOptions);

  const refreshCookieName = getRefreshCookieName(refreshTokenViaCookie);
  Cookies.remove(refreshCookieName);
}

export const beforeRequest =
  (prefix?: string, refreshTokenViaCookie?: CookieConfig): BeforeRequestHook =>
  (config) => {
    return Object.assign(config, {
      token: config.token || getRefreshToken(prefix, refreshTokenViaCookie),
    });
  };
