import { Options } from './types';

export const DEFAULT_CONFIG: Required<Options> = {
  count: 5,
  start: 3000,
  end: 30000,
};

export const WIDGET_TEST_PORTS_ENV_VARS = [
  'PLAYWRIGHT_COMPONENTS_PORT',
  'PLAYWRIGHT_WIDGET_PORT',
] as const;
