import { IS_LOCAL_STORAGE } from '../../constants';

export const UI_COMPONENTS_URL_KEY = 'base.ui.components.url';
export const LOCAL_STORAGE_OVERRIDE =
  IS_LOCAL_STORAGE && localStorage.getItem(UI_COMPONENTS_URL_KEY);
export const JS_FILE_PATH = 'dist/umd/index.js';
export const WEB_COMPONENTS_UI_LIB_NAME = '@descope/web-components-ui';
