/**
 * Represents an item stored in localStorage with TTL functionality.
 * Used to store flow nonces with automatic expiration.
 */
export interface StorageItem {
  /**
   * The actual nonce value
   */
  value: string;

  /**
   * Expiration timestamp in milliseconds (from Date.now())
   * After this time, the nonce will be considered invalid
   */
  expiry: number;

  /**
   * Indicates if this nonce was created during a flow start operation
   * Used to apply different TTL durations:
   * - true: 2 days TTL (for flow start)
   * - false: 3 hours TTL (for flow next)
   */
  isStart?: boolean;
}

/**
 * Configuration options for the flow nonce enhancer.
 * These options can be passed when creating the SDK.
 */
export interface FlowNonceOptions {
  /**
   * Enables or disables the flow nonce functionality.
   * When disabled, the enhancer will not add nonces to requests
   * or process nonces from responses.
   *
   * @default true
   */
  enableFlowNonce?: boolean;

  /**
   * Custom prefix for localStorage keys.
   * Allows multiple applications on the same domain
   * to use different storage namespaces.
   *
   * @default 'descopeFlowNonce'
   */
  storagePrefix?: string;
}
