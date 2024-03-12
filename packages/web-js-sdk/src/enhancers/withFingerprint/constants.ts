import { IS_BROWSER } from '../../constants';

const FINGERPRINT_PUBLIC_KEY = 'fingerprint.public.key';
const FINGERPRINT_ENDPOINT_URL = 'fingerprint.endpoint.url';

/** Fingerprint.js cloudflare integration */
export const FP_EP_URL =
  (IS_BROWSER && localStorage?.getItem(FINGERPRINT_ENDPOINT_URL)) ||
  'https://api.descope.com';
export const FP_CF_ENDPOINT_PATH = '/fXj8gt3x8VulJBna/x96Emn69oZwcd7I6';
export const FP_CF_SCRIPT_PATH = '/fXj8gt3x8VulJBna/w78aRZnnDZ3Aqw0I';
/** Fingerprint visitor data */
export const FP_BODY_DATA = 'fpData';
/** Session ID for visitor */
export const VISITOR_SESSION_ID_PARAM = 'vsid';
/** Request ID for visitor */
export const VISITOR_REQUEST_ID_PARAM = 'vrid';
/** FP storage key */
export const FP_STORAGE_KEY = 'fp';
// Storage FP Keys TTL is 24 hours
export const STORAGE_TTL_MS = 24 * 60 * 60 * 1000;
