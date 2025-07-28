const PORT_RANGE_START = 3000;
const PORT_RANGE_SIZE = 7000;
const HASH_SHIFT_BITS = 5;

/**
 * Generates a deterministic port number from a name using a simple hash function.
 * Ports are generated in the range 3000-9999 to avoid system port conflicts.
 *
 * @param name Name to generate a port for
 * @returns A port number between 3000 and 9999
 * @throws Error if widgetName is empty or invalid
 */
export function generatePortFromName(name: string): number {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('port generator: name must be specified!');
  }

  const hash = [...name].reduce(
    (hash, char) => (hash << HASH_SHIFT_BITS) - hash + char.charCodeAt(0),
    0,
  );

  // Generate port between 3000-9999
  return PORT_RANGE_START + (Math.abs(hash) % PORT_RANGE_SIZE);
}
