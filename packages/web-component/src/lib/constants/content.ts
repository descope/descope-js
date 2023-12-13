import { IS_LOCAL_STORAGE } from './general';

const BASE_CONTENT_URL_KEY = 'base.content.url';

// eslint-disable-next-line import/prefer-default-export
export const BASE_CONTENT_URL =
  (IS_LOCAL_STORAGE && localStorage.getItem(BASE_CONTENT_URL_KEY)) ||
  'https://static.descope.com/pages';

export const ASSETS_FOLDER = 'v2-beta';
export const PREV_VER_ASSETS_FOLDER = 'v2-alpha';

// Those files are saved on a new folder to prevent breaking changes
export const THEME_FILENAME = 'theme.json';
export const CONFIG_FILENAME = 'config.json';
