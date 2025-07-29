import createWebSdk from '@descope/web-js-sdk';
import { createOutboundAppsSdk } from './createOutboundAppsSdk';
import { createUserSdk } from './createUserSdk';

declare const BUILD_VERSION: string;

export const createSdk = (
  config: Parameters<typeof createWebSdk>[0],
  mock: boolean,
  widgetId?: string,
) => {
  const webSdk = createWebSdk({
    ...config,
    persistTokens: true,
    baseHeaders: {
      'x-descope-widget-type': 'outbound-applications-widget',
      'x-descope-widget-id': widgetId,
      'x-descope-widget-version': BUILD_VERSION,
    },
  });

  return {
    outboundApps: createOutboundAppsSdk({
      httpClient: webSdk.httpClient,
      mock,
    }),
    user: {
      ...createUserSdk({ httpClient: webSdk.httpClient, mock }),
    },
  };
};

export type Sdk = ReturnType<typeof createSdk>;
