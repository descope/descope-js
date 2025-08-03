import { DEFAULT_CONFIG, WIDGET_TEST_PORTS_ENV_VARS } from './constants';
import { validatePortOptions, generateUniquePorts } from './helpers';
import type { Options } from './types';

/**
 * Generates an array of n unique random ports within the specified range.
 */
export const generatePorts = (options: Options = {}): number[] => {
  const config: Required<Options> = { ...DEFAULT_CONFIG, ...options };
  const { count, start, end } = config;

  validatePortOptions(count, start, end);

  const rangeSize = end - start + 1;
  return generateUniquePorts(count, new Set(), start, rangeSize);
};

/**
 * Returns cached ports for components and widget, generating them only once across all process instances.
 * Uses environment variables to ensure ports remain consistent across Playwright workers.
 *
 * This function prevents duplicate port generation when Playwright config is imported multiple times
 * by different workers or processes during test execution.
 */
export const getWidgetTestPorts = (options: Options = {}): number[] => {
  const cachedPorts = WIDGET_TEST_PORTS_ENV_VARS.map(
    (varName) => process.env[varName],
  );
  const allPortsCached = cachedPorts.every((port) => port !== undefined);

  if (!allPortsCached) {
    const newPorts = generatePorts({
      ...options,
      count: WIDGET_TEST_PORTS_ENV_VARS.length,
    });

    WIDGET_TEST_PORTS_ENV_VARS.forEach((envVar, index) => {
      process.env[envVar] = newPorts[index].toString();
    });

    return newPorts;
  }

  return cachedPorts.map((port) => parseInt(port!, 10));
};
