import createWebSdk from '@descope/web-js-sdk';
import { createUserSdk } from './createUserSdk';

export const createSdk = (
  config: Parameters<typeof createWebSdk>[0],
  tenant: string,
  mock: boolean,
) => {
  const webSdk = createWebSdk({ ...config, persistTokens: true });

  return {
    user: {
      ...createUserSdk({ httpClient: webSdk.httpClient, tenant, mock }),
      logout: webSdk.logout,
    },
  };
};

export type Sdk = ReturnType<typeof createSdk>;
