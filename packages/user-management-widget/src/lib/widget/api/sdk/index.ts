import createWebSdk from '@descope/web-js-sdk';
import { createUserSdk } from './createUserSdk';

export const createSdk = (config: Parameters<typeof createWebSdk>[0], tenant: string) => {
  const webSdk = createWebSdk({...config, persistTokens: true});


  return {
    user: createUserSdk({ httpClient: webSdk.httpClient, tenant}),
  };
};

export type Sdk = ReturnType<typeof createSdk>
