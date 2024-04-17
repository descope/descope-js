import createWebSdk from '@descope/web-js-sdk';
import { createAccessKeySdk } from './createAccessKeySdk';
import { createTenantSdk } from './createTenantSdk';

export const createSdk = (
  config: Parameters<typeof createWebSdk>[0],
  tenant: string,
  mock: boolean,
) => {
  const webSdk = createWebSdk({
    ...config,
    persistTokens: true,
    baseHeaders: {
      'x-descope-widget-id': 'access-key-management-widget',
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
