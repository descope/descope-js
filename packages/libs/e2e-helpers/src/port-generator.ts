const HASH_SHIFT_BITS = 5;

type Range = {
  start: number;
  end: number;
};

/**
 * Generates a deterministic port number from a name using a simple hash function.
 */
export function generatePortFromName(
  name: string,
  range: Range = { start: 3000, end: 65000 },
): number {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('port generator: name must be specified!');
  }

  const hash = [...name].reduce(
    (hash, char) => (hash << HASH_SHIFT_BITS) - hash + char.charCodeAt(0),
    0,
  );

  const { start, end } = range;

  const rangeSize = end - start + 1;

  return start + (Math.abs(hash) % rangeSize);
}
