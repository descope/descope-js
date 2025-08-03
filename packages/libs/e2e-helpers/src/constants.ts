import { Options } from './types';

export const DEFAULT_CONFIG: Required<Options> = {
  count: 5,
  start: 3000,
  end: 30000,
};

export const ENV_COMPONENTS_PORT = 'PLAYWRIGHT_COMPONENTS_PORT';
export const ENV_WIDGET_PORT = 'PLAYWRIGHT_WIDGET_PORT';
