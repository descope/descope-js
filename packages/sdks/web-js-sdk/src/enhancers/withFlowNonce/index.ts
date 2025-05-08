import { CreateWebSdk } from '../../sdk';
import { AfterRequestHook, BeforeRequestHook } from '../../types';
import { addHooks } from '../helpers';
import {
  FLOW_NEXT_PATH,
  FLOW_NONCE_HEADER,
  FLOW_NONCE_PREFIX,
  FLOW_START_PATH,
} from './constants';
import {
  cleanupExpiredNonces,
  extractFlowNonce,
  getExecutionIdFromRequest,
  getFlowNonce,
  setFlowNonce,
} from './helpers';
import { FlowNonceOptions } from './types';

/**
 * Adds flow nonce handling to the SDK
 */
export const withFlowNonce =
  <T extends CreateWebSdk>(createSdk: T) =>
  (config: Parameters<T>[0] & FlowNonceOptions): ReturnType<T> => {
    const {
      enableFlowNonce = true,
      storagePrefix = FLOW_NONCE_PREFIX,
      ...sdkConfig
    } = config;

    if (!enableFlowNonce) {
      return createSdk(sdkConfig) as ReturnType<T>;
    }

    cleanupExpiredNonces(storagePrefix);

    const afterRequest: AfterRequestHook = async (req, res) => {
      if (req.path !== FLOW_START_PATH && req.path !== FLOW_NEXT_PATH) {
        return;
      }
      const { nonce, executionId } = await extractFlowNonce(req, res);

      if (nonce && executionId) {
        const isStart = req.path === FLOW_START_PATH;
        setFlowNonce(executionId, nonce, isStart, storagePrefix);
      }
    };

    const beforeRequest: BeforeRequestHook = (req) => {
      if (req.path === FLOW_NEXT_PATH) {
        const executionId = getExecutionIdFromRequest(req);

        if (executionId) {
          const nonce = getFlowNonce(executionId, storagePrefix);
          if (nonce) {
            req.headers = req.headers || {};
            req.headers[FLOW_NONCE_HEADER] = nonce;
          }
        }
      }
      return req;
    };

    return createSdk(
      addHooks(sdkConfig, { afterRequest, beforeRequest }),
    ) as ReturnType<T>;
  };

export * from './helpers';
export * from './types';
export * from './constants';
