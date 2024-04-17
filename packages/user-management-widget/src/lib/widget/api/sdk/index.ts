import createWebSdk from '@descope/web-js-sdk';
import { createUserSdk } from './createUserSdk';
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
      'x-descope-widget-id': 'user-management-widget',
    },
  });

  return {
    user: createUserSdk({ httpClient: webSdk.httpClient, tenant, mock }),
    tenant: createTenantSdk({ httpClient: webSdk.httpClient, tenant, mock }),
  };
};

export type Sdk = ReturnType<typeof createSdk>;
