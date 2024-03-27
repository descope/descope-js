import createWebSdk from '@descope/web-js-sdk';
import { createRoleSdk } from './createRoleSdk';
import { createTenantSdk } from './createTenantSdk';

export const createSdk = (
  config: Parameters<typeof createWebSdk>[0],
  tenant: string,
  mock: boolean,
) => {
  const webSdk = createWebSdk({ ...config, persistTokens: true });

  return {
    role: createRoleSdk({ httpClient: webSdk.httpClient, tenant, mock }),
    tenant: createTenantSdk({ httpClient: webSdk.httpClient, tenant, mock }),
  };
};

export type Sdk = ReturnType<typeof createSdk>;
