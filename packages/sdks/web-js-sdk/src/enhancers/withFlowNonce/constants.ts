export const FLOW_NONCE_PREFIX = 'descopeFlowNonce';
export const FLOW_NONCE_HEADER = 'X-Descope-Flow-Nonce';

export const FLOW_START_PATH = '/v1/flow/start';
export const FLOW_NEXT_PATH = '/v1/flow/next';

export const FLOW_NEXT_TTL = 3 * 60 * 60; // 3 hours in seconds
export const FLOW_START_TTL = 2 * 24 * 60 * 60; // 2 days in seconds

// Fallback timeout for in-flight serialization. If a response never arrives
// (network drop, aborted request), the in-flight promise is released after
// this many milliseconds so future calls are not stuck.
export const FLOW_NONCE_INFLIGHT_TIMEOUT_MS = 30_000;
