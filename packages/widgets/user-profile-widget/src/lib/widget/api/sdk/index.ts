import '@descope/core-js-sdk';
import createWebSdk from '@descope/web-js-sdk';
import type { ConditionsHttpClient } from '@descope/sdk-mixins';
import { createUserSdk } from './createUserSdk';
import { createDeviceSdk } from './createDeviceSdk';
import { createPasskeySdk } from './createPasskeySdk';

declare const BUILD_VERSION: string;

export const createSdk = (
  config: Parameters<typeof createWebSdk>[0],
  mock: boolean,
  widgetId?: string,
) => {
  const webSdk = createWebSdk({
    ...config,
    persistTokens: true,
    baseHeaders: {
      'x-descope-widget-type': 'user-profile-widget',
      'x-descope-widget-id': widgetId,
      'x-descope-widget-version': BUILD_VERSION,
    },
  });

  return {
    user: {
      ...createUserSdk({ httpClient: webSdk.httpClient, mock }),
      logout: !mock
        ? webSdk.logout
        : <typeof webSdk.logout>(<unknown>(async () => {})),
    },
    device: {
      ...createDeviceSdk({ httpClient: webSdk.httpClient, mock }),
    },
    passkey: {
      ...createPasskeySdk({ httpClient: webSdk.httpClient, mock }),
    },
    // a flow running in a popup can change the user - a new email, a new
    // password - which leaves this window holding a stale session, so the
    // widget refreshes once the popup is done with it
    refresh: !mock
      ? webSdk.refresh
      : <typeof webSdk.refresh>(<unknown>(async () => ({ ok: true }))),
    // Exposed (narrowed to a minimal type) so the shared conditions mixin reuses
    // this same webSdk instance for its fetch instead of creating its own.
    httpClient: webSdk.httpClient as ConditionsHttpClient,
  };
};

export type Sdk = ReturnType<typeof createSdk>;
