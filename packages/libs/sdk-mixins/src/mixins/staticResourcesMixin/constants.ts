import { IS_LOCAL_STORAGE } from '../../constants';

const BASE_CONTENT_URL_KEY = 'base.content.url';

export const BASE_CONTENT_URL =
  (IS_LOCAL_STORAGE && localStorage.getItem(BASE_CONTENT_URL_KEY)) ||
  'https://static.descope.com/pages';

export const ASSETS_FOLDER = 'v2-beta';
export const PREV_VER_ASSETS_FOLDER = 'v2-alpha';
