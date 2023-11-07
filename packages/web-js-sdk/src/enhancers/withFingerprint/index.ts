import { IS_BROWSER } from '../../constants';
import { CreateWebSdk } from '../../sdk';
import { BeforeRequestHook } from '../../types';
import { addHooks } from '../helpers';
import { FP_BODY_DATA } from './constants';
import { ensureFingerprintIds, getFingerprintData } from './helpers';
import { FingerprintOptions } from './types';

const beforeRequest: BeforeRequestHook = (config) => {
  const data = getFingerprintData();
  if (data && config.body) {
    config.body[FP_BODY_DATA] = data;
  }

  return config;
};

/**
 * Add fingerprint data to outgoing requests
 */
export const withFingerprint =
  <T extends CreateWebSdk>(createSdk: T) =>
  ({ fpKey, fpLoad, ...config }: Parameters<T>[0] & FingerprintOptions) => {
    // relevant only if fpKey was provided
    if (fpKey) {
      if (!IS_BROWSER) {
        // eslint-disable-next-line no-console
        console.warn(
          'Fingerprint is a client side only capability and will not work when running in the server'
        );
      } else if (fpLoad) {
        ensureFingerprintIds(fpKey).catch(() => null);
      }
    }

    // Hook added always because fingerprint can be dynamic using flows
    return createSdk(addHooks(config, { beforeRequest }));
  };
