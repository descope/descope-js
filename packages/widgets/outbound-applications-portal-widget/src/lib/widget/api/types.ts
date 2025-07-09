import createWebSdk from '@descope/web-js-sdk';

export type Sdk = ReturnType<typeof createWebSdk>;

export type HttpClient = Sdk['httpClient'];

export type OutboundApplication = {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  logo?: string;
};
