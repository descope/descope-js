import createWebSdk from '@descope/web-js-sdk';
import { createAuditSdk } from './createAuditSdk';

export const createSdk = (
  config: Parameters<typeof createWebSdk>[0],
  tenant: string,
  mock: boolean,
  widgetId: string,
) => {
  const webSdk = createWebSdk({
    ...config,
    persistTokens: true,
    baseHeaders: {
      'x-descope-widget-type': 'audit-management-widget',
      'x-descope-widget-id': widgetId,
    },
  });

  return {
    audit: createAuditSdk({ httpClient: webSdk.httpClient, tenant, mock }),
  };
};

export type Sdk = ReturnType<typeof createSdk>;
