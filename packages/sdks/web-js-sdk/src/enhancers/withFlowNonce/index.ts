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

/**
 * One link in a per-executionId FIFO chain. `promise` resolves when this
 * request finishes; `finish` releases the slot exactly once.
 */
type ChainLink = { promise: Promise<void>; finish: () => void };

/**
 * `/v1/flow/next` is the only path we serialize. URL may have a query
 * string, so compare against the pathname.
 */
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
 * SDK serializes flow.next bodies as JSON strings. Anything else (no body,
 * FormData, Blob) is ignored: we only serialize requests whose executionId
 * we can read.
 */
const readExecIdFromBody = (init?: RequestInit): string | null => {
  if (typeof init?.body !== 'string') return null;
  try {
    const parsed = JSON.parse(init.body);
    return parsed?.executionId ? extractExecId(parsed.executionId) : null;
  } catch {
    return null;
  }
};

/**
 * Adds flow nonce handling to the SDK.
 *
 * Concurrent flow.next calls for the same executionId would otherwise read
 * the same nonce from localStorage. Server rotates atomically on the first
 * request and rejects the second with E108201. This enhancer chains
 * concurrent calls per executionId: each waits for its predecessor's
 * afterRequest to store the rotated nonce, then re-reads it before sending.
 *
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

    // One FIFO chain per executionId. Wrapper appends. afterRequest releases
    // the head. Each link's finish is idempotent and self-splices.
    const chains = new Map<string, ChainLink[]>();

    const appendChainLink = (execId: string): ChainLink => {
      let resolve!: () => void;
      const promise = new Promise<void>((r) => {
        resolve = r;
      });
      let done = false;
      const link: ChainLink = {
        promise,
        finish: () => {
          if (done) return;
          done = true;
          const list = chains.get(execId);
          if (list) {
            const i = list.indexOf(link);
            if (i !== -1) list.splice(i, 1);
            if (list.length === 0) chains.delete(execId);
          }
          resolve();
        },
      };
      const list = chains.get(execId) ?? [];
      list.push(link);
      chains.set(execId, list);
      return link;
    };

    const previousLink = (
      execId: string,
      self: ChainLink,
    ): ChainLink | undefined => {
      const list = chains.get(execId);
      if (!list) return undefined;
      const i = list.indexOf(self);
      return i > 0 ? list[i - 1] : undefined;
    };

    const baseFetch: typeof fetch =
      (sdkConfig as { fetch?: typeof fetch }).fetch ||
      ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));

    const wrappedFetch: typeof fetch = async (input, init) => {
      if (!isFlowNextUrl(input)) return baseFetch(input, init);
      const execId = readExecIdFromBody(init);
      if (!execId) return baseFetch(input, init);

      // Append synchronously so siblings in the same tick see us as their
      // predecessor.
      const link = appendChainLink(execId);
      const predecessor = previousLink(execId, link);

      if (predecessor) {
        await predecessor.promise.catch(() => undefined);
      }

      // We are at the head of the chain. Start the stuck-fetch fallback now
      // (not while waiting), so a slow predecessor does not burn our budget.
      const fallback = setTimeout(link.finish, FLOW_NONCE_INFLIGHT_TIMEOUT_MS);

      // Re-read after predecessor's afterRequest stored the rotated nonce.
      // `new Headers(...)` copies whatever HeadersInit we received without
      // mutating the caller's object.
      const headers = new Headers(init?.headers);
      const nonce = getFlowNonce(execId, nonceStoragePrefix);
      if (nonce) headers.set(FLOW_NONCE_HEADER, nonce);
      else headers.delete(FLOW_NONCE_HEADER);

      try {
        return await baseFetch(input, { ...init, headers });
      } catch (err) {
        // afterRequest does not run when fetch rejects; release here so the
        // successor isn't stuck behind us.
        link.finish();
        throw err;
      } finally {
        clearTimeout(fallback);
        // Successful release happens in afterRequest, AFTER the rotated
        // nonce is written to localStorage.
      }
    };

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
        // Release the head of the chain. Storage already happened above so
        // any successor that wakes up reads the rotated nonce.
        if (req.path === FLOW_NEXT_PATH) {
          const execId = getExecutionIdFromRequest(req);
          if (execId) chains.get(execId)?.[0]?.finish();
        }
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
