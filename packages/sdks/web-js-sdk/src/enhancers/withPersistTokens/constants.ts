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
/* Key for tracking last known auth status per project */
export const LAST_AUTH_KEY = 'DSP_LAST_AUTH';
export const LAST_AUTH_STATE = { auth: 'auth', unauth: 'unauth' } as const;
