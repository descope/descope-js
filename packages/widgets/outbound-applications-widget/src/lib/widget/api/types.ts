import createWebSdk from '@descope/web-js-sdk';

export type Sdk = ReturnType<typeof createWebSdk>;

export type HttpClient = Sdk['httpClient'];

export type User = {
  userId: string;
};

export type OutboundApplication = {
  id: string;
  name: string;
  description?: string;
  logo?: string;
};
