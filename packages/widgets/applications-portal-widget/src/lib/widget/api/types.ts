import createWebSdk from '@descope/web-js-sdk';

export type Sdk = ReturnType<typeof createWebSdk>;

export type HttpClient = Sdk['httpClient'];

export enum SSOAppType {
  oidc = 'oidc',
  saml = 'saml',
}

export type SSOApplication = {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  appType: SSOAppType;
  logo?: string;
  samlSettings?: {
    idpInitiatedUrl: string;
  };
};
