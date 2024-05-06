import createWebSdk from '@descope/web-js-sdk';
import { createUserSdk } from './createUserSdk';
import '@descope/core-js-sdk';

export const createSdk = (
  config: Parameters<typeof createWebSdk>[0],
  mock: boolean,
) => {
  const webSdk = createWebSdk({ ...config, persistTokens: true });

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
