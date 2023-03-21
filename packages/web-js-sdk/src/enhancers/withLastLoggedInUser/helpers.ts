import {
  getLocalStorage,
  removeLocalStorage,
  setLocalStorage,
} from '../helpers';
import {
  LOCAL_STORAGE_LAST_USER_LOGIN_ID,
  LOCAL_STORAGE_LAST_USER_DISPLAY_NAME,
} from './constants';

export const setLastUserLoginId = (loginId: string) => {
  return setLocalStorage(LOCAL_STORAGE_LAST_USER_LOGIN_ID, loginId);
};

export const getLastUserLoginId = () => {
  return getLocalStorage(LOCAL_STORAGE_LAST_USER_LOGIN_ID);
};

export const removeLastUserLoginId = () => {
  return removeLocalStorage(LOCAL_STORAGE_LAST_USER_LOGIN_ID);
};

export const setLastUserDisplayName = (displayName: string) => {
  return setLocalStorage(LOCAL_STORAGE_LAST_USER_DISPLAY_NAME, displayName);
};

export const getLastUserDisplayName = () => {
  return getLocalStorage(LOCAL_STORAGE_LAST_USER_DISPLAY_NAME);
};

export const removeLastUserDisplayName = () => {
  return removeLocalStorage(LOCAL_STORAGE_LAST_USER_DISPLAY_NAME);
};
