/** Default name for the session cookie name / local storage key */
export const SESSION_TOKEN_KEY = 'DS';
/** Default name for the refresh local storage key */
export const REFRESH_TOKEN_KEY = 'DSR';
/* Default name for the id token local storage key */
export const ID_TOKEN_KEY = 'DSI';
/* Default name for the trusted device token (DTD) local storage key */
export const TRUSTED_DEVICE_TOKEN_KEY = 'DTD';
/* Key for persisting the server-returned refresh cookie name */
export const REFRESH_COOKIE_NAME_KEY = 'DSRCN';
/* Non-HttpOnly cookie set by backend on login — used to skip the tryRefresh network call when absent */
export const LOGGED_IN_COOKIE_KEY = 'DSL';
/* localStorage key that must be set to 'true' to enable the DSL-cookie-based tryRefresh optimization */
export const REFRESH_OPTIMIZATION_KEY = 'DSLO';
