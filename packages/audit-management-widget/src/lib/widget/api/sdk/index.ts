import createWebSdk from '@descope/web-js-sdk';
import { createAuditSdk } from './createAuditSdk';

export const createSdk = (
  config: Parameters<typeof createWebSdk>[0],
  tenant: string,
  mock: boolean,
) => {
  const webSdk = createWebSdk({ ...config, persistTokens: true });

  return {
    audit: createAuditSdk({ httpClient: webSdk.httpClient, tenant, mock }),
  };
};

export type Sdk = ReturnType<typeof createSdk>;
