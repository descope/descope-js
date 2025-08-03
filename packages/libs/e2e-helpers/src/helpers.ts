/**
 * Standardized error for port options validation.
 */
export const optionsError = (message: string): Error =>
  new Error(`Port Generator: ${message}`);

/**
 * Validates port generation options.
 */
export const validatePortOptions = (
  count: number,
  start: number,
  end: number,
): void => {
  if (!Number.isInteger(count) || count <= 0) {
    throw optionsError('Count must be a positive integer');
  }

  if (start >= end) {
    throw optionsError(
      `Start port (${start}) must be less than end port (${end})`,
    );
  }

  const rangeSize = end - start + 1;

  if (count > rangeSize) {
    throw optionsError(
      `Cannot generate ${count} unique ports from range ${start}-${end} (only ${rangeSize} ports available)`,
    );
  }
};

/**
 * Recursively generates unique random ports within the specified range.
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
    return generateUniquePorts(needed, existing, start, rangeSize);
  }

  existing.add(port);

  return generateUniquePorts(needed - 1, existing, start, rangeSize);
};
