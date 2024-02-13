import { IS_LOCAL_STORAGE } from '../../constants/general';

export const DESCOPE_UI_SCRIPT_ID = 'load-descope-ui-script';
export const DESCOPE_UI_FALLBACK_SCRIPT_ID = 'load-descope-ui-fallback-script';

export const UI_COMPONENTS_URL_KEY = 'base.ui.components.url';

export const UI_COMPONENTS_URL =
  (IS_LOCAL_STORAGE && localStorage.getItem(UI_COMPONENTS_URL_KEY)) ||
  'https://<base-url>/npm/@descope/web-components-ui@<version>/dist/umd/index.js';

export const UI_COMPONENTS_FALLBACK_URL =
  (IS_LOCAL_STORAGE && localStorage.getItem(UI_COMPONENTS_URL_KEY)) ||
  'https://cdn.jsdelivr.net/npm/@descope/web-components-ui@<version>/dist/umd/index.js';

export const UI_COMPONENTS_URL_VERSION_PLACEHOLDER = '<version>';
