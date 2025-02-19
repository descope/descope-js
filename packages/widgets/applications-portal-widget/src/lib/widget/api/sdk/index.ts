import createWebSdk from '@descope/web-js-sdk';
import { createSsoAppsSdk } from './createSsoAppsSdk';

declare const BUILD_VERSION: string;

export const createSdk = (
  config: Parameters<typeof createWebSdk>[0],
  mock: boolean,
  widgetId?: string,
  refreshCookieName?: string,
) => {
  const webSdk = createWebSdk({
    ...config,
    persistTokens: true,
    baseHeaders: {
      'x-descope-widget-type': 'applications-portal-widget',
      'x-descope-widget-id': widgetId,
      'x-descope-widget-version': BUILD_VERSION,
      ...(refreshCookieName && {
        'x-descope-refresh-cookie-name': refreshCookieName,
      }),
    },
  });

  return {
    ssoApps: createSsoAppsSdk({ httpClient: webSdk.httpClient, mock }),
  };
};

export type Sdk = ReturnType<typeof createSdk>;
