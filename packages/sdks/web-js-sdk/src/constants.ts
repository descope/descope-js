// This sdk can be used in SSR apps
export const IS_BROWSER = typeof window !== 'undefined';

// Maximum timeout value for setTimeout
// For more information, refer to https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#maximum_delay_value
export const MAX_TIMEOUT = Math.pow(2, 31) - 1;

export const OIDC_CLIENT_TS_DESCOPE_CDN_URL =
  'https://descopecdn.com/npm/oidc-client-ts@3.1.0/dist/browser/oidc-client-ts.min.js';
export const OIDC_CLIENT_TS_JSDELIVR_CDN_URL =
  'https://cdn.jsdelivr.net/npm/oidc-client-ts@3.1.0/dist/browser/oidc-client-ts.min.js';
