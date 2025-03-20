import { IS_LOCAL_STORAGE } from '../../constants';

export const DESCOPE_UI_SCRIPT_ID = 'load-descope-ui';
export const DESCOPE_UI_FALLBACK_SCRIPT_ID = 'load-descope-ui-fallback-script';
export const DESCOPE_UI_FALLBACK_2_SCRIPT_ID =
  'load-descope-ui-fallback-script-2';

export const UI_COMPONENTS_URL_KEY = 'base.ui.components.url';

export const UI_COMPONENTS_URL =
  (IS_LOCAL_STORAGE && localStorage.getItem(UI_COMPONENTS_URL_KEY)) ||
  'https://descopecdn.com/npm/@descope/web-components-ui@<version>/dist/umd/index.js';

export const UI_COMPONENTS_FALLBACK_URL =
  (IS_LOCAL_STORAGE && localStorage.getItem(UI_COMPONENTS_URL_KEY)) ||
  'https://static.descope.com/npm/@descope/web-components-ui@<version>/dist/umd/index.js';

export const UI_COMPONENTS_FALLBACK_2_URL =
  (IS_LOCAL_STORAGE && localStorage.getItem(UI_COMPONENTS_URL_KEY)) ||
  'https://cdn.jsdelivr.net/npm/@descope/web-components-ui@<version>/dist/umd/index.js';

export const UI_COMPONENTS_URL_VERSION_PLACEHOLDER = '<version>';
