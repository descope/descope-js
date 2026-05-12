import {
  DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY,
  DESCOPE_LAST_AUTH_IN_FLIGHT_LOCAL_STORAGE_KEY,
} from '../constants';
import { getStorageItem, removeStorageItem, setStorageItem } from './storage';
import { LastAuthState } from '../types';

export function getLastAuth(loginId: string): LastAuthState {
  const lastAuth: LastAuthState = {};
  try {
    Object.assign(
      lastAuth,
      JSON.parse(getStorageItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY)),
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[Descope] Failed to read last auth from storage', e);
  }

  if (!lastAuth.loginId && !loginId) {
    return {};
  }
  return lastAuth;
}

// save last auth to local storage
export function setLastAuth(lastAuth: LastAuthState, forceLoginId?: boolean) {
  if (!lastAuth?.authMethod) {
    return;
  }
  if (forceLoginId && !lastAuth.loginId) {
    return;
  }
  setStorageItem(DESCOPE_LAST_AUTH_LOCAL_STORAGE_KEY, JSON.stringify(lastAuth));
}

// Read the in-flight lastUsedPerScreen to be merged into dls_last_auth on completion.
export function getInFlightLastUsedPerScreen(): Record<string, string> {
  try {
    return JSON.parse(
      getStorageItem(DESCOPE_LAST_AUTH_IN_FLIGHT_LOCAL_STORAGE_KEY) || '{}',
    );
  } catch (e) {
    return {};
  }
}

// Records the last-clicked opt-in element per screen for the current in-progress flow.
// Kept separate from dls_last_auth, so abandoned flows never pollute the authenticated
// user record; written on every click so it survives mid-flow navigations
// (OAuth redirects, magic links, etc.) without special per-mechanism handling.
export function updateLastUsedPerScreen(screenId: string, elementId: string) {
  try {
    const stored = getInFlightLastUsedPerScreen();
    stored[screenId] = elementId;
    setStorageItem(
      DESCOPE_LAST_AUTH_IN_FLIGHT_LOCAL_STORAGE_KEY,
      JSON.stringify(stored),
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[Descope] Failed to update in-flight last auth storage', e);
  }
}

// Clear in-flight state. Called on flow completion and on new flow start.
export function clearInFlightLastAuth() {
  try {
    removeStorageItem(DESCOPE_LAST_AUTH_IN_FLIGHT_LOCAL_STORAGE_KEY);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[Descope] Failed to clear in-flight last auth storage', e);
  }
}
