import { FLOW_NONCE_KEY } from './constants';
import { StorageInterface } from './types';

/**
 * Gets the flow nonce from localStorage
 */
export const getFlowNonce = (storage: StorageInterface): string | null => {
  try {
    return storage.getItem(FLOW_NONCE_KEY);
  } catch (e) {
    console.error('Error getting flow nonce:', e);
    return null;
  }
};

/**
 * Sets the flow nonce in localStorage
 */
export const setFlowNonce = (
  nonce: string,
  storage: StorageInterface,
): void => {
  try {
    storage.setItem(FLOW_NONCE_KEY, nonce);
  } catch (e) {
    console.error('Error setting flow nonce:', e);
  }
};

/**
 * Removes the flow nonce from localStorage
 */
export const removeFlowNonce = (storage: StorageInterface): void => {
  try {
    storage.removeItem(FLOW_NONCE_KEY);
  } catch (e) {
    console.error('Error removing flow nonce:', e);
  }
};

/**
 * Extracts the flow nonce from response headers
 */
export const extractFlowNonceFromResponse = (
  response: Response,
): string | null => {
  try {
    return response.headers.get(FLOW_NONCE_KEY);
  } catch (e) {
    console.error('Error extracting flow nonce from response:', e);
    return null;
  }
};
