import {
  FLOW_NONCE_HEADER,
  FLOW_NONCE_PREFIX,
  FLOW_NEXT_TTL,
  FLOW_START_TTL,
  FLOW_NEXT_PATH,
} from './constants';
import { StorageItem } from './types';
import { RequestConfig } from '@descope/core-js-sdk';

// Helper to create storage key from execution ID
const getNonceKeyForExecution = (
  executionId: string,
  prefix: string = FLOW_NONCE_PREFIX,
): string => {
  return `${prefix}${executionId}`;
};

// Get nonce from storage with expiration check
const getFlowNonce = (
  executionId: string,
  prefix: string = FLOW_NONCE_PREFIX,
): string | null => {
  try {
    const key = getNonceKeyForExecution(executionId, prefix);
    const itemStr = localStorage.getItem(key);

    if (!itemStr) {
      return null;
    }

    const item: StorageItem = JSON.parse(itemStr);

    if (item.expiry < Date.now()) {
      removeFlowNonce(executionId, prefix);
      return null;
    }

    return item.value;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error getting flow nonce:', e);
    return null;
  }
};

// Store nonce with appropriate TTL
const setFlowNonce = (
  executionId: string,
  nonce: string,
  isStart: boolean,
  prefix: string = FLOW_NONCE_PREFIX,
): void => {
  try {
    const key = getNonceKeyForExecution(executionId, prefix);
    const ttlSeconds = isStart ? FLOW_START_TTL : FLOW_NEXT_TTL;

    const item: StorageItem = {
      value: nonce,
      expiry: Date.now() + ttlSeconds * 1000,
      isStart,
    };

    localStorage.setItem(key, JSON.stringify(item));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error setting flow nonce:', e);
  }
};

// Remove nonce from storage
const removeFlowNonce = (
  executionId: string,
  prefix: string = FLOW_NONCE_PREFIX,
): void => {
  try {
    const key = getNonceKeyForExecution(executionId, prefix);
    localStorage.removeItem(key);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error removing flow nonce:', e);
  }
};

// Extract execution ID from special format
const extractExecId = (executionId: string): string => {
  const regex = /.*\|#\|(.*)/;
  return regex.exec(executionId)?.[1] || '';
};

// Extract nonce and execution ID from response
const extractFlowNonce = async (
  req: RequestConfig,
  response: Response,
): Promise<{ nonce: string | null; executionId: string | null }> => {
  try {
    const nonce = response.headers.get(FLOW_NONCE_HEADER);

    // Clone the response to prevent body consumption
    let executionId = await response
      .clone()
      .json()
      .then((data) => data?.executionId || null)
      .catch(() => null);

    if (!executionId) {
      // Fallback to request
      executionId = getExecutionIdFromRequest(req);
    }

    return {
      nonce,
      executionId: executionId ? extractExecId(executionId) : null,
    };
  } catch (e) {
    return { nonce: null, executionId: null };
  }
};

// Get execution ID from request object
const getExecutionIdFromRequest = (req: RequestConfig): string | null => {
  if (req.path === FLOW_NEXT_PATH && req.body?.executionId) {
    return extractExecId(req.body.executionId);
  }

  return null;
};

// Remove expired nonces from storage
const cleanupExpiredNonces = (prefix: string = FLOW_NONCE_PREFIX): void => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key && key.startsWith(prefix)) {
        const itemStr = localStorage.getItem(key);

        if (itemStr) {
          try {
            const item: StorageItem = JSON.parse(itemStr);

            if (item.expiry < Date.now()) {
              localStorage.removeItem(key);
            }
          } catch (parseError) {
            localStorage.removeItem(key);
          }
        }
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error cleaning up expired nonces:', e);
  }
};

export {
  getNonceKeyForExecution,
  getFlowNonce,
  setFlowNonce,
  removeFlowNonce,
  extractFlowNonce,
  getExecutionIdFromRequest,
  cleanupExpiredNonces,
};
