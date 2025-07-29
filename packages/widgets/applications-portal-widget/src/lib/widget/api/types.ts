import createWebSdk from '@descope/web-js-sdk';

export type Sdk = ReturnType<typeof createWebSdk>;

export type HttpClient = Sdk['httpClient'];

export enum SSOAppType {
  oidc = 'oidc',
  saml = 'saml',
}

interface App {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  logo?: string;
}

export interface SamlApplication extends App {
  appType: SSOAppType.saml;
  samlSettings?: {
    idpInitiatedUrl: string;
  };
}

export interface OidcApplication extends App {
  appType: SSOAppType.oidc;
  oidcSettings?: {
    customIdpInitiatedLoginPageUrl: string;
  };
}

export type SSOApplication = SamlApplication | OidcApplication;
