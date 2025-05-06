// Flow nonce options
export interface FlowNonceOptions {
  storage?: StorageInterface;
  enableFlowNonce?: boolean;
}

/**
 * Interface for storage implementations used to store flow nonces
 */
export interface StorageInterface {
  /**
   * Gets an item from storage by key
   * @param key The key to retrieve
   * @returns The stored value or null if not found
   */
  getItem(key: string): string | null;

  /**
   * Sets an item in storage
   * @param key The key to set
   * @param value The value to store
   */
  setItem(key: string, value: string): void;

  /**
   * Removes an item from storage
   * @param key The key to remove
   */
  removeItem(key: string): void;
}
