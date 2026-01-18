import type { NonceOptions } from './types';

const DEFAULT_NONCE_LENGTH = 32;

export const generateNonce = (options?: NonceOptions): string => {
  const length = options?.length ?? DEFAULT_NONCE_LENGTH;
  const encoding = options?.encoding ?? 'base64';

  const array = new Uint8Array(length);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else if (typeof require !== 'undefined') {
    const nodeCrypto = require('crypto');
    nodeCrypto.randomFillSync(array);
  } else {
    throw new Error('No crypto implementation available');
  }

  if (encoding === 'hex') {
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    );
  }

  return btoa(Array.from(array, (byte) => String.fromCharCode(byte)).join(''));
};
