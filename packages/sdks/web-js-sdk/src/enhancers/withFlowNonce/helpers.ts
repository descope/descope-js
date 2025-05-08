import { get } from 'http';
import {
  FLOW_NONCE_HEADER,
  FLOW_NONCE_PREFIX,
  FLOW_NEXT_TTL,
  FLOW_START_TTL,
  FLOW_NEXT_PATH,
} from './constants';
import { StorageItem } from './types';
import { RequestConfig } from '@descope/core-js-sdk';

export const getNonceKeyForExecution = (
  executionId: string,
  prefix: string = FLOW_NONCE_PREFIX,
): string => {
  return `${prefix}${executionId}`;
};

export const getFlowNonce = (
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
    console.error('Error getting flow nonce:', e);
    return null;
  }
};

export const setFlowNonce = (
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
    console.error('Error setting flow nonce:', e);
  }
};

export const removeFlowNonce = (
  executionId: string,
  prefix: string = FLOW_NONCE_PREFIX,
): void => {
  try {
    const key = getNonceKeyForExecution(executionId, prefix);
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Error removing flow nonce:', e);
  }
};

const extractExecId = (executionId: string) => {
  const regex = /.*\|#\|(.*)/;
  return regex.exec(executionId)?.[1] || '';
};

export const extractFlowNonce = async (
  req: RequestConfig,
  response: Response,
): Promise<{ nonce: string | null; executionId: string | null }> => {
  try {
    const nonce = response.headers.get(FLOW_NONCE_HEADER);

    // Clone the response to prevent body consumption
    let executionId = await response
      .clone()
      .json()
      .then((data) => {
        if (data && data.executionId) {
          return data.executionId;
        }
        return null;
      })
      .catch(() => null);

    if (!executionId) {
      // Fallback to request
      executionId = getExecutionIdFromRequest(req);
    }

    return { nonce, executionId: extractExecId(executionId) };
  } catch (e) {
    console.error('Error extracting flow nonce from response:', e);
    return { nonce: null, executionId: null };
  }
};

export const getExecutionIdFromRequest = (
  req: RequestConfig,
): string | null => {
  if (req.path === FLOW_NEXT_PATH && req.body && req.body.executionId) {
    return extractExecId(req.body.executionId);
  }

  return null;
};

export const cleanupExpiredNonces = (
  prefix: string = FLOW_NONCE_PREFIX,
): void => {
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
    console.error('Error cleaning up expired nonces:', e);
  }
};
