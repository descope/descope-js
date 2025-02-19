import createWebSdk from '@descope/web-js-sdk';
import { createAccessKeySdk } from './createAccessKeySdk';
import { createTenantSdk } from './createTenantSdk';

declare const BUILD_VERSION: string;

export const createSdk = (
  config: Parameters<typeof createWebSdk>[0],
  tenant: string,
  mock: boolean,
  widgetId?: string,
  refreshCookieName?: string,
) => {
  const webSdk = createWebSdk({
    ...config,
    persistTokens: true,
    baseHeaders: {
      'x-descope-widget-type': 'access-key-management-widget',
      'x-descope-widget-id': widgetId,
      'x-descope-widget-version': BUILD_VERSION,
      ...(refreshCookieName && {
        'x-descope-refresh-cookie-name': refreshCookieName,
      }),
    },
  });

  return {
    accesskey: createAccessKeySdk({
      httpClient: webSdk.httpClient,
      tenant,
      mock,
    }),
    tenant: createTenantSdk({ httpClient: webSdk.httpClient, tenant, mock }),
  };
};

export type Sdk = ReturnType<typeof createSdk>;
