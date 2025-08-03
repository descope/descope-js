/**
 * Creates a standardized error for port generation issues.
 */
export const createPortError = (message: string): Error =>
  new Error(`Port Generator: ${message}`);

/**
 * Validates that count is a positive integer.
 */
export const validatePortCount = (count: number): void => {
  if (!Number.isInteger(count) || count <= 0) {
    throw createPortError('Count must be a positive integer');
  }
};

/**
 * Validates port generation options.
 */
export const validatePortOptions = (
  count: number,
  start: number,
  end: number,
): void => {
  validatePortCount(count);

  if (start >= end) {
    throw createPortError(
      `Start port (${start}) must be less than end port (${end})`,
    );
  }

  const rangeSize = end - start + 1;
  if (count > rangeSize) {
    throw createPortError(
      `Cannot generate ${count} unique ports from range ${start}-${end} (only ${rangeSize} ports available)`,
    );
  }
};

/**
 * Recursively generates unique random ports within the specified range.
 *
 * @param needed - Number of ports still needed
 * @param existing - Set of already generated ports
 * @param start - Minimum port number
 * @param rangeSize - Size of the port range
 * @returns Array of unique port numbers
 */
export const generateUniquePorts = (
  needed: number,
  existing: Set<number>,
  start: number,
  rangeSize: number,
): number[] => {
  if (needed === 0) {
    return Array.from(existing);
  }

  const port = start + Math.floor(Math.random() * rangeSize);

  if (existing.has(port)) {
    // Port collision - try again with recursion
    return generateUniquePorts(needed, existing, start, rangeSize);
  }

  // Add unique port and continue
  existing.add(port);
  return generateUniquePorts(needed - 1, existing, start, rangeSize);
};
