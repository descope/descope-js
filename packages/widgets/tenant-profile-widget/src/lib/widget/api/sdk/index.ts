import '@descope/core-js-sdk';
import createWebSdk from '@descope/web-js-sdk';
import type { ConditionsHttpClient } from '@descope/sdk-mixins';
import { createTenantSdk } from './createTenantSdk';
import { createUserSdk } from './createUserSdk';

declare const BUILD_VERSION: string;

export const createSdk = (
  config: Parameters<typeof createWebSdk>[0],
  tenant: string,
  mock: boolean,
  widgetId?: string,
) => {
  const webSdk = createWebSdk({
    ...config,
    persistTokens: true,
    baseHeaders: {
      'x-descope-widget-type': 'tenant-profile-widget',
      'x-descope-widget-id': widgetId,
      'x-descope-widget-version': BUILD_VERSION,
    },
  });

  return {
    user: createUserSdk({ httpClient: webSdk.httpClient, mock }),
    tenant: createTenantSdk({
      httpClient: webSdk.httpClient,
      tenantId: tenant,
      mock,
    }),
    // Exposed (narrowed to a minimal type) so the shared conditions mixin reuses
    // this same webSdk instance for its fetch instead of creating its own.
    httpClient: webSdk.httpClient as ConditionsHttpClient,
  };
};

export type Sdk = ReturnType<typeof createSdk>;
