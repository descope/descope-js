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
      nonceStoragePrefix = FLOW_NONCE_PREFIX,
      ...sdkConfig
    } = config;

    if (!enableFlowNonce) {
      return createSdk(sdkConfig) as ReturnType<T>;
    }

    cleanupExpiredNonces(nonceStoragePrefix);

    const afterRequest: AfterRequestHook = async (req, res) => {
      if (req.path !== FLOW_START_PATH && req.path !== FLOW_NEXT_PATH) {
        return;
      }
      const { nonce, executionId } = await extractFlowNonce(req, res);

      if (nonce && executionId) {
        const isStart = req.path === FLOW_START_PATH;
        setFlowNonce(executionId, nonce, isStart, nonceStoragePrefix);
      }
    };

    const beforeRequest: BeforeRequestHook = (req) => {
      if (req.path === FLOW_NEXT_PATH) {
        const executionId = getExecutionIdFromRequest(req);

        if (executionId) {
          const nonce = getFlowNonce(executionId, nonceStoragePrefix);
          if (nonce) {
            req.headers = req.headers || {};
            req.headers[FLOW_NONCE_HEADER] = nonce;
          }
        }
      }
      return req;
    };

    const sdk = createSdk(
      addHooks(sdkConfig, { afterRequest, beforeRequest }),
    ) as ReturnType<T>;

    // Serialize concurrent flow.next calls so the second one reads the
    // rotated nonce stored by the first's afterRequest. See descope/etc#15600.
    if (sdk.flow?.next) {
      let chain: Promise<void> = Promise.resolve();
      const originalNext = sdk.flow.next.bind(sdk.flow);
      sdk.flow.next = async (...args: Parameters<typeof originalNext>) => {
        const myTurn = chain;
        let release!: () => void;
        chain = new Promise<void>((resolve) => {
          release = resolve;
        });
        await myTurn;
        try {
          return await originalNext(...args);
        } finally {
          release();
        }
      };
    }

    return sdk;
  };

export * from './helpers';
export * from './types';
export * from './constants';
