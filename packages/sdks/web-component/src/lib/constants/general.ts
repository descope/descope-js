/* eslint-disable import/prefer-default-export */
export const IS_LOCAL_STORAGE = typeof localStorage !== 'undefined';

export const FETCH_EXCEPTION_ERROR_CODE = 'J151000';
export const FETCH_ERROR_RESPONSE_ERROR_CODE = 'J151001';

export const IS_RUNNING_IN_DESCOPE_BRIDGE = (window as any).isDescopeBridge;
