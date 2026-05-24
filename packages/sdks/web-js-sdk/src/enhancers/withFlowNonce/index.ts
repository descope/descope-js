import { CreateWebSdk } from '../../sdk';
import { AfterRequestHook, BeforeRequestHook } from '../../types';
import { addHooks } from '../helpers';
import {
  FLOW_NEXT_PATH,
  FLOW_NONCE_HEADER,
  FLOW_NONCE_INFLIGHT_TIMEOUT_MS,
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

const isFlowNextUrl = (input: RequestInfo | URL): boolean => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url;
  try {
    return new URL(url).pathname === FLOW_NEXT_PATH;
  } catch {
    return false;
  }
};

/**
 * Adds flow nonce handling to the SDK.
 *
 * Two concurrent flow.next calls in the same SDK instance would otherwise
 * read the same nonce from localStorage. Server rotates atomically on the
 * first and rejects the second with E108201. This enhancer chains flow.next
 * requests through a single in-flight promise so each call waits for its
 * predecessor to store the rotated nonce, then re-reads it before sending.
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

    // One in-flight chain per SDK instance. flow.next requests run serially.
    let chain: Promise<void> = Promise.resolve();
    // beforeRequest captures the executionId from the parsed body so the
    // fetch wrapper does not have to re-parse the serialized JSON.
    let currentExecId: string | null = null;
    // Tracks RequestInit objects already serialized so the core-js-sdk
    // retry wrapper (createFetchLogger.ts) does not re-enter and deadlock.
    // The retry loop calls our fetch with the same args, so this WeakSet
    // identifies a retry by reference to the original init object.
    const retryBypass = new WeakSet<object>();

    const baseFetch: typeof fetch =
      (sdkConfig as { fetch?: typeof fetch }).fetch ||
      ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));

    const wrappedFetch: typeof fetch = async (input, init) => {
      if (!isFlowNextUrl(input)) return baseFetch(input, init);
      if (init && retryBypass.has(init)) return baseFetch(input, init);
      if (init) retryBypass.add(init);

      let release!: () => void;
      const myTurn = chain;
      chain = new Promise<void>((resolve) => {
        release = resolve;
      });
      await myTurn;

      // Predecessor has finished and stored its rotated nonce. Re-read and
      // overwrite the header on a fresh Headers instance so the caller's
      // object is not mutated.
      const headers = new Headers(init?.headers);
      if (currentExecId) {
        const nonce = getFlowNonce(currentExecId, nonceStoragePrefix);
        if (nonce) headers.set(FLOW_NONCE_HEADER, nonce);
        else headers.delete(FLOW_NONCE_HEADER);
      }

      const fallback = setTimeout(release, FLOW_NONCE_INFLIGHT_TIMEOUT_MS);
      try {
        const res = await baseFetch(input, { ...init, headers });
        // Store the rotated nonce BEFORE releasing the chain so the next
        // request reads the new value, not the stale one. afterRequest
        // performs the same write later; it is idempotent.
        const rotated = res.headers.get(FLOW_NONCE_HEADER);
        if (rotated && currentExecId) {
          setFlowNonce(currentExecId, rotated, false, nonceStoragePrefix);
        }
        return res;
      } finally {
        clearTimeout(fallback);
        release();
      }
    };

    const beforeRequest: BeforeRequestHook = (req) => {
      if (req.path !== FLOW_NEXT_PATH) return req;
      const execId = getExecutionIdFromRequest(req);
      if (!execId) return req;
      currentExecId = execId;
      const nonce = getFlowNonce(execId, nonceStoragePrefix);
      if (nonce) {
        req.headers = req.headers || {};
        req.headers[FLOW_NONCE_HEADER] = nonce;
      }
      return req;
    };

    const afterRequest: AfterRequestHook = async (req, res) => {
      if (req.path !== FLOW_START_PATH && req.path !== FLOW_NEXT_PATH) {
        return;
      }
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

    return createSdk(
      addHooks(
        { ...sdkConfig, fetch: wrappedFetch },
        { afterRequest, beforeRequest },
      ),
    ) as ReturnType<T>;
  };

export * from './helpers';
export * from './types';
export * from './constants';
