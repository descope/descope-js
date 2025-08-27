import {
  DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
  IS_LOCAL_STORAGE,
} from '../constants';
import { NextFnReturnPromiseValue } from '../types';

export function getLastAuth(loginId: string) {
  const lastAuth = {};
  try {
    Object.assign(
      lastAuth,
      JSON.parse(localStorage.getItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY)),
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
  if (IS_LOCAL_STORAGE) {
    localStorage.setItem(
      DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
      JSON.stringify(lastAuth),
    );
  }
}
