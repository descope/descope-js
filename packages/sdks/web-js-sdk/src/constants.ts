// This sdk can be used in SSR apps
export const IS_BROWSER = typeof window !== 'undefined';

// Maximum timeout value for setTimeout
// For more information, refer to https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#maximum_delay_value
export const MAX_TIMEOUT = Math.pow(2, 31) - 1;

// The amount of time (ms) to trigger the refresh before session expires
export const REFRESH_THRESHOLD = 20 * 1000; // 20 sec
