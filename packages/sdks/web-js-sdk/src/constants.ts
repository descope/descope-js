const OIDC_CLIENT_TS_VERSION = '3.2.0';

// This sdk can be used in SSR apps
export const IS_BROWSER = typeof window !== 'undefined';

// Maximum timeout value for setTimeout
// For more information, refer to https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#maximum_delay_value
export const MAX_TIMEOUT = Math.pow(2, 31) - 1;

// The amount of time (ms) to trigger the refresh before session expires
export const REFRESH_THRESHOLD = 20 * 1000; // 20 sec

export const OIDC_CLIENT_TS_DESCOPE_CDN_URL = `https://descopecdn.com/npm/oidc-client-ts@${OIDC_CLIENT_TS_VERSION}/dist/browser/oidc-client-ts.min.js`;
export const OIDC_CLIENT_TS_JSDELIVR_CDN_URL = `https://cdn.jsdelivr.net/npm/oidc-client-ts@${OIDC_CLIENT_TS_VERSION}/dist/browser/oidc-client-ts.min.js`;

export const OIDC_LOGOUT_ERROR_CODE = 'J161000';
export const OIDC_REFRESH_ERROR_CODE = 'J161001';

export const REFRESH_DISABLED = 'J171000';
