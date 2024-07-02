import { IS_LOCAL_STORAGE } from '../../constants';

const BASE_CONTENT_URL_KEY = 'base.content.url';

export const BASE_CONTENT_URL = 'https://static.descope.com/pages';

export const OVERRIDE_CONTENT_URL =
  (IS_LOCAL_STORAGE && localStorage.getItem(BASE_CONTENT_URL_KEY)) || '';

export const ASSETS_FOLDER = 'v2-beta';
export const PREV_VER_ASSETS_FOLDER = 'v2-alpha';
