import {
  DEFAULT_CONFIG,
  ENV_COMPONENTS_PORT,
  ENV_WIDGET_PORT,
} from './constants';
import { validatePortOptions, generateUniquePorts } from './helpers';
import type { Options } from './types';

/**
 * Generates an array of n unique random ports within the specified range.
 */
export function generatePorts(options: Options = {}): number[] {
  const config: Required<Options> = { ...DEFAULT_CONFIG, ...options };
  const { count, start, end } = config;

  validatePortOptions(count, start, end);

  const rangeSize = end - start + 1;
  return generateUniquePorts(count, new Set(), start, rangeSize);
}

/**
 * Returns cached ports for components and widget, generating them only once across all process instances.
 * Uses environment variables to ensure ports remain consistent across Playwright workers.
 *
 * This function prevents duplicate port generation when Playwright config is imported multiple times
 * by different workers or processes during test execution.
 */
export function getWidgetTestPorts(options: Options = {}): number[] {
  const componentsPort = process.env[ENV_COMPONENTS_PORT];
  const widgetPort = process.env[ENV_WIDGET_PORT];

  if (!componentsPort || !widgetPort) {
    const [newComponentsPort, widgetPort] = generatePorts({
      count: 2,
      ...options,
    });
    process.env[ENV_COMPONENTS_PORT] = newComponentsPort.toString();
    process.env[ENV_WIDGET_PORT] = widgetPort.toString();
    return [newComponentsPort, widgetPort];
  }

  return [parseInt(componentsPort, 10), parseInt(widgetPort, 10)];
}
