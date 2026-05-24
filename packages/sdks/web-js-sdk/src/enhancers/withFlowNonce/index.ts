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
  extractExecId,
  extractFlowNonce,
  getExecutionIdFromRequest,
  getFlowNonce,
  setFlowNonce,
} from './helpers';
import { FlowNonceOptions } from './types';

const cloneHeaders = (headers: HeadersInit | undefined): HeadersInit => {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const clone = new Headers();
    headers.forEach((value, key) => clone.append(key, value));
    return clone;
  }
  if (Array.isArray(headers)) {
    return headers.map(([k, v]) => [k, v] as [string, string]);
  }
  return { ...(headers as Record<string, string>) };
};

const setNonceOnHeaders = (
  headers: HeadersInit,
  nonce: string,
): HeadersInit => {
  if (headers instanceof Headers) {
    headers.set(FLOW_NONCE_HEADER, nonce);
    return headers;
  }
  const lower = FLOW_NONCE_HEADER.toLowerCase();
  if (Array.isArray(headers)) {
    return [
      ...headers.filter(([k]) => k.toLowerCase() !== lower),
      [FLOW_NONCE_HEADER, nonce],
    ];
  }
  const obj = { ...(headers as Record<string, string>) };
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase() === lower) delete obj[k];
  }
  obj[FLOW_NONCE_HEADER] = nonce;
  return obj;
};

const deleteNonceFromHeaders = (headers: HeadersInit): HeadersInit => {
  const lower = FLOW_NONCE_HEADER.toLowerCase();
  if (headers instanceof Headers) {
    headers.delete(FLOW_NONCE_HEADER);
    return headers;
  }
  if (Array.isArray(headers)) {
    return headers.filter(([k]) => k.toLowerCase() !== lower);
  }
  const obj = { ...(headers as Record<string, string>) };
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase() === lower) delete obj[k];
  }
  return obj;
};

const matchesFlowNextPath = (urlStr: string): boolean => {
  try {
    return new URL(urlStr).pathname === FLOW_NEXT_PATH;
  } catch {
    return false;
  }
};

const getExecutionIdFromFetchArgs = (
  input: RequestInfo | URL,
  init?: RequestInit,
): string | null => {
  let urlStr: string;
  if (typeof input === 'string') urlStr = input;
  else if (input instanceof URL) urlStr = input.toString();
  else urlStr = (input as Request).url || '';
  if (!matchesFlowNextPath(urlStr)) return null;
  const body = init?.body;
  if (typeof body !== 'string') return null;
  try {
    const parsed = JSON.parse(body);
    if (!parsed?.executionId) return null;
    return extractExecId(parsed.executionId);
  } catch {
    return null;
  }
};

/**
 * Adds flow nonce handling to the SDK.
 *
 * Concurrent flow.next calls for the same executionId share the same nonce in
 * localStorage. Without serialization, the server rotates the nonce on the
 * first request and rejects the second with E108201. This enhancer serializes
 * concurrent calls at the fetch layer so each one reads the freshly-rotated
 * nonce written by its predecessor's afterRequest. See descope/etc#15600.
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

    // Per-executionId in-flight chain. New flow.next calls await the previous
    // entry before re-reading the nonce. FIFO release queue lets afterRequest
    // release the head entry (so storage happens before release, eliminating
    // the read-stale-localStorage race on successors).
    const inflight = new Map<string, Promise<void>>();
    const releaseQueue = new Map<string, Array<() => void>>();

    const afterRequest: AfterRequestHook = async (req, res) => {
      try {
        if (req.path === FLOW_START_PATH || req.path === FLOW_NEXT_PATH) {
          const { nonce, executionId } = await extractFlowNonce(req, res);

          if (nonce && executionId) {
            const isStart = req.path === FLOW_START_PATH;
            setFlowNonce(executionId, nonce, isStart, nonceStoragePrefix);
          }
        }
      } finally {
        if (req.path === FLOW_NEXT_PATH) {
          const reqExecId = getExecutionIdFromRequest(req);
          if (reqExecId) {
            const q = releaseQueue.get(reqExecId);
            // finish() splices itself out of the queue; calling head fires
            // the FIFO-correct release for this request.
            if (q && q.length > 0) q[0]();
          }
        }
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

    const baseFetch: typeof fetch =
      (sdkConfig as { fetch?: typeof fetch }).fetch ||
      ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));

    const wrappedFetch: typeof fetch = async (input, init) => {
      const executionId = getExecutionIdFromFetchArgs(input, init);
      if (!executionId) {
        return baseFetch(input, init);
      }

      const previous = inflight.get(executionId);
      let alreadyFinished = false;
      let release!: () => void;
      const myPromise = new Promise<void>((r) => {
        release = r;
      });
      inflight.set(executionId, myPromise);

      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const finish = () => {
        if (alreadyFinished) return;
        alreadyFinished = true;
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        if (inflight.get(executionId) === myPromise) {
          inflight.delete(executionId);
        }
        const q = releaseQueue.get(executionId);
        if (q) {
          const idx = q.indexOf(finish);
          if (idx !== -1) q.splice(idx, 1);
          if (q.length === 0) releaseQueue.delete(executionId);
        }
        release();
      };

      let queue = releaseQueue.get(executionId);
      if (!queue) {
        queue = [];
        releaseQueue.set(executionId, queue);
      }
      queue.push(finish);

      if (previous) {
        try {
          await previous;
        } catch {
          /* predecessor failure should not block successors */
        }
      }

      // Start the fallback timer once we are at the front of the chain so a
      // long wait behind a slow predecessor does not consume our budget.
      timeoutId = setTimeout(finish, FLOW_NONCE_INFLIGHT_TIMEOUT_MS);

      // Re-read after predecessor's afterRequest stored its rotated value.
      const freshNonce = getFlowNonce(executionId, nonceStoragePrefix);
      const safeInit: RequestInit = init ? { ...init } : {};
      const cloned = cloneHeaders(init?.headers);
      safeInit.headers = freshNonce
        ? setNonceOnHeaders(cloned, freshNonce)
        : deleteNonceFromHeaders(cloned);

      return baseFetch(input, safeInit).catch((err) => {
        // afterRequest does not run when fetch rejects; release here.
        finish();
        throw err;
      });
    };

    const finalConfig = addHooks(
      { ...sdkConfig, fetch: wrappedFetch },
      { afterRequest, beforeRequest },
    );

    return createSdk(finalConfig) as ReturnType<T>;
  };

export * from './helpers';
export * from './types';
export * from './constants';
