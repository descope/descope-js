import createWebSdk from '@descope/web-js-sdk';
import { createAccessKeySdk } from './createAccessKeySdk';
import { createTenantSdk } from './createTenantSdk';

export const createSdk = (
  config: Parameters<typeof createWebSdk>[0],
  tenant: string,
) => {
  const webSdk = createWebSdk({ ...config, persistTokens: true });

  return {
    accesskey: createAccessKeySdk({ httpClient: webSdk.httpClient, tenant }),
    tenant: createTenantSdk({ httpClient: webSdk.httpClient, tenant }),
  };
};

export type Sdk = ReturnType<typeof createSdk>;
