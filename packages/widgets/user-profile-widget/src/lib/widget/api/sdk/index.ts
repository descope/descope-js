import '@descope/core-js-sdk';
import createWebSdk from '@descope/web-js-sdk';
import { createUserSdk } from './createUserSdk';

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
  };
};

export type Sdk = ReturnType<typeof createSdk>;
