import { IS_LOCAL_STORAGE } from '../../constants';

export const DEBUG_LOGS_URL_KEY = 'base.debug.logs.url';
export const LOCAL_STORAGE_OVERRIDE =
  IS_LOCAL_STORAGE && localStorage.getItem(DEBUG_LOGS_URL_KEY);
export const JS_FILE_PATH = 'dist/index.js';
export const DEBUG_LOGS_LIB_NAME = '@descope/debug-logs';
