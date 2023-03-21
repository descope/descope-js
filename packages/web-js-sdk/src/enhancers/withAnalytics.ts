import { CreateWebSdk } from '../sdk';
import { BeforeRequestHook } from '../types';
import { addHooks } from './helpers';

// this is replaced in build time
declare const BUILD_VERSION: string;
/**
 * Adds analytics headers to requests
 */
export const withAnalytics =
  <T extends CreateWebSdk>(createSdk: T) =>
  (config: Parameters<T>[0]) =>
    createSdk({
      ...config,
      baseHeaders: {
        'x-descope-sdk-name': 'web-js',
        'x-descope-sdk-version': BUILD_VERSION,
        ...config.baseHeaders,
      },
    });
