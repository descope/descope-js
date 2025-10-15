import { DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY } from '../constants';
import { getStorageItem, setStorageItem } from './storage';
import { NextFnReturnPromiseValue } from '../types';
import { setLastUserLoginId } from '@descope/web-js-sdk';

export function getLastAuth(loginId: string) {
  const lastAuth = {};
  try {
    Object.assign(
      lastAuth,
      JSON.parse(getStorageItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY)),
    );
  } catch (e) {
    /* empty */
  }

  if (!(lastAuth as any)?.loginId && !loginId) {
    return {};
  }
  return lastAuth;
}

// save last auth to local storage
export function setLastAuth(
  lastAuth: NextFnReturnPromiseValue['data']['lastAuth'],
  forceLoginId?: boolean,
) {
  if (!lastAuth?.authMethod) {
    return;
  }
  if (forceLoginId && !(lastAuth as any)?.loginId) {
    return;
  }
  setStorageItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY, JSON.stringify(lastAuth));
  if ((lastAuth as any)?.loginId) {
    setLastUserLoginId((lastAuth as any)?.loginId);
  }
}
