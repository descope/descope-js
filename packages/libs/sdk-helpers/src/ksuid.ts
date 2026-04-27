const KSUID_EPOCH = 1_400_000_000;
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Decodes the creation timestamp (Unix seconds) from a Descope project ID.
 * Project IDs use KSUID format: the last 27 base62 characters encode 20 bytes,
 * where the first 4 bytes are seconds since the KSUID epoch (2014-05-13).
 * Returns null for any malformed input.
 */
export function decodeProjectCreatedAt(projectId: string): number | null {
  if (!projectId || projectId.length < 27) return null;

  const body = projectId.slice(-27);
  const bytes = new Uint8Array(20);

  for (let ci = 0; ci < body.length; ci++) {
    const idx = BASE62.indexOf(body[ci]);
    if (idx < 0) return null;
    // Multiply the running value by 62 and add the new digit (LSB → MSB carry)
    let carry = idx;
    for (let i = 19; i >= 0; i--) {
      const val = bytes[i] * 62 + carry;
      bytes[i] = val & 0xff;
      carry = val >> 8;
    }
  }

  // First 4 bytes are the timestamp as a big-endian uint32
  const ts =
    ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return ts + KSUID_EPOCH;
}
