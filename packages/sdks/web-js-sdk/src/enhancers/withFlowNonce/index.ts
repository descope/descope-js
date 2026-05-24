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
 * Adds flow nonce handling to the SDK.
 *
 * Two concurrent flow.next calls in the same SDK instance would otherwise
 * read the same nonce from localStorage. Server rotates atomically on the
 * first and rejects the second with E108201. This enhancer serializes
 * sdk.flow.next calls so each one reads the freshly-rotated nonce stored
 * by the previous call's afterRequest before its own beforeRequest runs.
 * See descope/etc#15600.
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

    const beforeRequest: BeforeRequestHook = (req) => {
      if (req.path !== FLOW_NEXT_PATH) return req;
      const execId = getExecutionIdFromRequest(req);
      if (!execId) return req;
      const nonce = getFlowNonce(execId, nonceStoragePrefix);
      if (nonce) {
        req.headers = req.headers || {};
        req.headers[FLOW_NONCE_HEADER] = nonce;
      }
      return req;
    };

    const afterRequest: AfterRequestHook = async (req, res) => {
      if (req.path !== FLOW_START_PATH && req.path !== FLOW_NEXT_PATH) return;
      const { nonce, executionId } = await extractFlowNonce(req, res);
      if (nonce && executionId) {
        setFlowNonce(
          executionId,
          nonce,
          req.path === FLOW_START_PATH,
          nonceStoragePrefix,
        );
      }
    };

    const sdk = createSdk(
      addHooks(sdkConfig, { afterRequest, beforeRequest }),
    ) as ReturnType<T>;

    // Serialize concurrent flow.next calls. The next call only starts after
    // the previous call's afterRequest has stored the rotated nonce, so the
    // next call's beforeRequest reads the fresh value.
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
