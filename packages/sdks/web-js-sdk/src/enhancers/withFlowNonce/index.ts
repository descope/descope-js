import { CreateWebSdk } from '../../sdk';
import { AfterRequestHook, BeforeRequestHook } from '../../types';
import { addHooks } from '../helpers';
import { FLOW_NONCE_KEY } from './constants';
import {
  extractFlowNonceFromResponse,
  getFlowNonce,
  setFlowNonce,
} from './helpers';
import { FlowNonceOptions, StorageInterface } from './types';

/**
 * Adds flow nonce handling to the SDK
 */
export const withFlowNonce =
  <T extends CreateWebSdk>(createSdk: T) =>
  (config: Parameters<T>[0] & FlowNonceOptions): ReturnType<T> => {
    // Extract flow nonce options
    const {
      storage = localStorage as StorageInterface,
      enableFlowNonce = true,
      ...sdkConfig
    } = config;

    // If flow nonce is disabled, just return the regular SDK
    if (!enableFlowNonce) {
      return createSdk(sdkConfig) as ReturnType<T>;
    }

    // After request hook to store the nonce
    const afterRequest: AfterRequestHook = async (_req, res) => {
      const nonce = extractFlowNonceFromResponse(res);
      if (nonce) {
        setFlowNonce(nonce, storage);
      }
    };

    // Before request hook to add the nonce to the request
    const beforeRequest: BeforeRequestHook = (req) => {
      if (req.path === '/flow/v1/next') {
        const nonce = getFlowNonce(storage);
        if (nonce) {
          req.headers = req.headers || {};
          req.headers[FLOW_NONCE_KEY] = nonce;
        }
      }
      return req;
    };

    // Create the SDK with the hooks
    return createSdk(
      addHooks(sdkConfig, { afterRequest, beforeRequest }),
    ) as ReturnType<T>;
  };
