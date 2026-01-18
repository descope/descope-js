// workaround for TS issue https://github.com/microsoft/TypeScript/issues/42873
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type * as _1 from '@descope/core-js-sdk';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type * as _2 from 'oidc-client-ts';
import { createSdk } from '@descope/web-js-sdk';
import { baseHeaders } from './constants';

export { createSdk };

type Sdk = ReturnType<typeof createSdkWrapper>;
let globalSdk: Sdk | undefined;

const IS_BROWSER = typeof window !== 'undefined';

const createSdkWrapper = <P extends Parameters<typeof createSdk>[0]>(
  config: P,
) => {
  const sdk = createSdk({
    persistTokens: IS_BROWSER as true,
    autoRefresh: IS_BROWSER as true,
    ...config,
    baseHeaders: {
      ...baseHeaders,
      ...config.baseHeaders,
    },
  });
  globalSdk = sdk;
  return sdk;
};

// Create a temp SDK to enable helper functions before initialization
const createTempSdk = () =>
  createSdkWrapper({
    projectId: 'temp pid',
    persistTokens: false,
    autoRefresh: false,
    storeLastAuthenticatedUser: false,
  });

// Initialize temp SDK for helper functions
globalSdk = createTempSdk();

/**
 * Get the current session token
 */
export const getSessionToken = (): string => {
  if (IS_BROWSER) {
    return globalSdk?.getSessionToken() ?? '';
  }
  // eslint-disable-next-line no-console
  console.warn('Get session token is not supported in SSR');
  return '';
};

/**
 * Get the current refresh token
 */
export const getRefreshToken = (): string => {
  if (IS_BROWSER) {
    return globalSdk?.getRefreshToken() ?? '';
  }
  // eslint-disable-next-line no-console
  console.warn('Get refresh token is not supported in SSR');
  return '';
};

/**
 * Refresh the session token
 */
export const refresh = (token = getRefreshToken()) => globalSdk?.refresh(token);

/**
 * Check if the session token is expired
 */
export const isSessionTokenExpired = (token = getSessionToken()) =>
  globalSdk?.isJwtExpired(token);

/**
 * Check if the refresh token is expired
 */
export const isRefreshTokenExpired = (token = getRefreshToken()) =>
  globalSdk?.isJwtExpired(token);

/**
 * Get JWT roles from the token
 */
export const getJwtRoles = (token = getSessionToken(), tenant?: string) => {
  try {
    return globalSdk?.getJwtRoles(token, tenant);
  } catch {
    return undefined;
  }
};

/**
 * Get JWT permissions from the token
 */
export const getJwtPermissions = (
  token = getSessionToken(),
  tenant?: string,
) => {
  try {
    return globalSdk?.getJwtPermissions(token, tenant);
  } catch {
    return undefined;
  }
};

/**
 * Get the current tenant from the token
 */
export const getCurrentTenant = (token = getSessionToken()) => {
  try {
    return globalSdk?.getCurrentTenant(token);
  } catch {
    return undefined;
  }
};

export const getGlobalSdk = () => globalSdk;

export const setGlobalSdk = (sdk: Sdk) => {
  globalSdk = sdk;
};

export default createSdkWrapper;
