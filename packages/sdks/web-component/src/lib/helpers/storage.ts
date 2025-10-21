// Storage helper functions for web-component package
// These functions provide a consistent interface for storage operations
// Currently uses localStorage, but structured to support custom storage in the future

import type { CustomStorage } from '../types';

// this is a singleton
// but in order to keep the code clean
// it was implemented in this way
let customStorage: CustomStorage | undefined;

/**
 * Set an item in storage
 */
export const setStorageItem = (key: string, value: string): void => {
  if (customStorage) {
    customStorage.setItem(key, value);
  } else if (typeof window?.localStorage !== 'undefined') {
    window.localStorage.setItem(key, value);
  }
};

/**
 * Get an item from storage
 */
export const getStorageItem = (key: string): string | null => {
  if (customStorage) {
    return customStorage.getItem(key);
  }

  if (typeof window?.localStorage !== 'undefined') {
    return window.localStorage.getItem(key);
  }
  return null;
};

/**
 * Remove an item from storage
 */
export const removeStorageItem = (key: string): void => {
  if (customStorage) {
    customStorage.removeItem(key);
  } else if (typeof window?.localStorage !== 'undefined') {
    window.localStorage.removeItem(key);
  }
};

/**
 * Set custom storage for the web-component package
 */
export const setCustomStorage = (storage: CustomStorage) => {
  customStorage = storage;
};

/**
 * Reset custom storage (for testing)
 */
export const resetCustomStorage = () => {
  customStorage = undefined;
};
