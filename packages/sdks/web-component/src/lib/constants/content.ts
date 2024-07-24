import { IS_LOCAL_STORAGE } from './general';

const BASE_CONTENT_URL_KEY = 'base.content.url';

// eslint-disable-next-line import/prefer-default-export
export const OVERRIDE_CONTENT_URL =
  (IS_LOCAL_STORAGE && localStorage.getItem(BASE_CONTENT_URL_KEY)) || '';
export const BASE_CONTENT_URL = 'https://static.descope.com/pages';

export const ASSETS_FOLDER = 'v2-beta';
export const PREV_VER_ASSETS_FOLDER = 'v2-alpha';

export const CONFIG_FILENAME = 'config.json';
