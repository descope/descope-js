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
  getFlowNonceRecord,
  maxSeq,
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
      const { nonce, seq, executionId } = await extractFlowNonce(req, res);

      if (!nonce || !executionId) {
        return;
      }
      const isStart = req.path === FLOW_START_PATH;
      // Concurrent flow legs (polling loop, verify/resume, submits) across
      // tabs and SDK instances write this one shared key out of order. The
      // server prefixes each nonce with a monotonic per-execution sequence;
      // track the highest seen so the newest nonce wins regardless of arrival
      // order and a late stale response cannot overwrite it (descope/etc#17286).
      // `highWater` is retained independently of the stored nonce so an
      // unsequenced write (feature disabled / older server / partial failure)
      // does not erase it and reopen the race. Unsequenced nonces fall back to
      // last-writer-wins, unchanged prior behavior. The read-compare-write is
      // deliberately unlocked: an interleaved write can only keep the
      // second-newest nonce (still valid server-side, the server holds a set)
      // and the next sequenced response converges the store.
      const stored = getFlowNonceRecord(executionId, nonceStoragePrefix);
      const highWater = stored?.seq;
      const skip =
        !isStart &&
        seq !== undefined &&
        highWater !== undefined &&
        seq <= highWater;
      if (skip) {
        return;
      }
      const nextSeq = maxSeq(seq, isStart ? undefined : highWater);
      setFlowNonce(executionId, nonce, isStart, nonceStoragePrefix, nextSeq);
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
