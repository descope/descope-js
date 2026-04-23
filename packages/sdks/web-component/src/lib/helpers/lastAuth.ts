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

// Track which opt-in element was last used per screen during an in-progress flow.
// Written on every qualifying click so the data survives any page navigation
// (OAuth redirect, magic link, etc.) without special per-mechanism handling.
// This key is separate from dls_last_auth so partial/abandoned flows never
// pollute the last authenticated user record.
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
