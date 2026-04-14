import createWebSdk from '@descope/web-js-sdk';

export type Sdk = ReturnType<typeof createWebSdk>;

export type HttpClient = Sdk['httpClient'];

export enum SSOAppType {
  oidc = 'oidc',
  saml = 'saml',
  wsfed = 'wsfed',
  custom = 'custom',
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

export interface WsFedApplication extends App {
  appType: SSOAppType.wsfed;
  wsfedSettings?: {
    idpInitiatedURL: string;
    realm: string;
    replyURL: string;
    loginPageURL: string;
  };
}

export interface CustomApplication extends App {
  appType: SSOAppType.custom;
  customSettings?: {
    loginPageUrl: string;
  };
}

export type SSOApplication =
  | SamlApplication
  | OidcApplication
  | WsFedApplication
  | CustomApplication;
