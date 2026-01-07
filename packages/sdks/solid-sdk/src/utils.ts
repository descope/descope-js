/**
 * Checks if we're running inside Descope Bridge (native mobile flows)
 */
export const isDescopeBridge = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as any).isDescopeBridge;
};

/**
 * Validates that the SDK is available before calling methods
 */
export const withValidation = <T extends (...args: any[]) => any>(
  fn?: T,
): ((...args: Parameters<T>) => ReturnType<T>) => {
  return (...args: Parameters<T>) => {
    if (!fn) {
      throw new Error(
        'SDK not initialized. Make sure you are inside a DescopeProvider.',
      );
    }
    return fn(...args);
  };
};
