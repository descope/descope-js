/** Default Descope API URL */
export const BASE_URL_REGION_PLACEHOLDER = '<region>';
export const DEFAULT_BASE_API_URL = `https://api.${BASE_URL_REGION_PLACEHOLDER}descope.com`;

/** Default magic link polling interval for checking if the user clicked on the magic-link/enchanted-link/notp */
export const MIN_POLLING_INTERVAL_MS = 1000; // 1 second
/** Default maximum time we are willing to wait for the magic-link/enchanted-link/notp to be clicked */
export const MAX_POLLING_TIMEOUT_MS = 1000 * 60 * 10; // 10 minutes

/**  Descope current tenant claim */
export const DESCOPE_CURRENT_TENANT_CLAIM = 'dct';

/** API paths to the Descope service */
export { default as apiPaths } from './apiPaths';
