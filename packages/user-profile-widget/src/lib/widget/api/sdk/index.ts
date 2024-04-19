import createWebSdk from '@descope/web-js-sdk';
import { createUserSdk } from './createUserSdk';
import '@descope/core-js-sdk';

declare const BUILD_VERSION: string;

export const createSdk = (
  config: Parameters<typeof createWebSdk>[0],
  tenant: string,
  mock: boolean,
  widgetId?: string,
) => {
  const webSdk = createWebSdk({ ...config, persistTokens: true,
    baseHeaders: {
      'x-descope-widget-type': 'user-profile-widget',
      'x-descope-widget-id': widgetId,
      'x-descope-widget-version': BUILD_VERSION,
    },
   });

  return {
    user: {
      ...createUserSdk({ httpClient: webSdk.httpClient, tenant, mock }),
      logout: !mock ? webSdk.logout :
        <typeof webSdk.logout><unknown>(async () => { }),
    },
  };
};

export type Sdk = ReturnType<typeof createSdk>;
