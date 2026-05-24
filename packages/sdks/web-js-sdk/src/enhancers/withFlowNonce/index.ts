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
 * predecessor's afterRequest to store the rotated nonce, then re-reads it
 * before sending. See descope/etc#15600.
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
    let releaseCurrent: (() => void) | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    // The current flow's executionId, captured in beforeRequest where we
    // still have the parsed body. The fetch wrapper only sees the serialized
    // body, so we reuse this rather than parsing JSON again.
    let currentExecId: string | null = null;

    const releaseChain = () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      fallbackTimer = null;
      const r = releaseCurrent;
      releaseCurrent = null;
      r?.();
    };

    const baseFetch: typeof fetch =
      (sdkConfig as { fetch?: typeof fetch }).fetch ||
      ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));

    const wrappedFetch: typeof fetch = async (input, init) => {
      if (!isFlowNextUrl(input)) return baseFetch(input, init);

      let myRelease!: () => void;
      const myTurn = chain;
      chain = new Promise<void>((resolve) => {
        myRelease = resolve;
      });
      await myTurn;
      // Claim the live slot now that we are at the head of the chain.
      releaseCurrent = myRelease;
      fallbackTimer = setTimeout(releaseChain, FLOW_NONCE_INFLIGHT_TIMEOUT_MS);

      // Re-read nonce: predecessor's afterRequest stored the rotated value
      // before resolving the chain. `new Headers(...)` copies whatever
      // HeadersInit shape we received without mutating the caller's object.
      const headers = new Headers(init?.headers);
      if (currentExecId) {
        const nonce = getFlowNonce(currentExecId, nonceStoragePrefix);
        if (nonce) headers.set(FLOW_NONCE_HEADER, nonce);
        else headers.delete(FLOW_NONCE_HEADER);
      }

      try {
        return await baseFetch(input, { ...init, headers });
      } catch (err) {
        // afterRequest does not run on fetch reject; release here.
        releaseChain();
        throw err;
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
      try {
        if (req.path === FLOW_START_PATH || req.path === FLOW_NEXT_PATH) {
          const { nonce, executionId } = await extractFlowNonce(req, res);
          if (nonce && executionId) {
            setFlowNonce(
              executionId,
              nonce,
              req.path === FLOW_START_PATH,
              nonceStoragePrefix,
            );
          }
        }
      } finally {
        // Release after storage so any waiting flow.next reads the rotated
        // nonce instead of the stale one.
        if (req.path === FLOW_NEXT_PATH) releaseChain();
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
