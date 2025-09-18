import { CreateWebSdk } from '../sdk';
import { CustomStorage } from '../types';
import { setCustomStorage } from './helpers';

/**
 * Adds custom storage support
 */
export const withCustomStorage =
  <T extends CreateWebSdk>(createSdk: T) =>
  (config: Parameters<T>[0] & { customStorage?: CustomStorage }) => {
    setCustomStorage(config.customStorage);

    return createSdk(config);
  };
