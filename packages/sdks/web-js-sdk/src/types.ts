import createCoreSdk, { JWTResponse } from '@descope/core-js-sdk';
import { SigninResponse } from 'oidc-client-ts';

type Head<T extends ReadonlyArray<any>> = T extends readonly [] ? never : T[0];

export type OidcConfigOptions = {
  applicationId?: string;
  // Client ID for OIDC. Required if issuer is provided.
  // For inbound apps, provide issuer with this clientId (e.g., issuer: 'https://api.descope.com/v1/apps/{projectId}')
  clientId?: string;
  // Custom issuer/authority URL. If provided, clientId is required.
  // For inbound apps, construct the issuer URL manually: `${baseUrl}/v1/apps/${projectId}`
  issuer?: string;
  // default is current URL
  redirectUri?: string;
  // default is openid email roles descope.custom_claims offline_access
  // default is 'openid' if issuer (and clientId) is provided
  scope?: string;
};

export type OidcConfig = boolean | OidcConfigOptions;

// Replace specific param of a function in a specific index, with a new type
export type ReplaceParam<
  Args extends readonly any[],
  Idx extends keyof Args,
  NewType,
> = {
  [K in keyof Args]: K extends Idx ? NewType : Args[K];
};

/** Descope Core SDK types */
export type CreateCoreSdk = typeof createCoreSdk;
export type CoreSdk = ReturnType<CreateCoreSdk>;
export type CoreSdkConfig = Head<Parameters<CreateCoreSdk>>;
export type WebSdkConfig = CoreSdkConfig & {
  oidcConfig?: OidcConfig;
  getExternalToken?: () => Promise<string>;
  customStorage?: CustomStorage;
};

/* JWT response with idToken */
export type WebJWTResponse = JWTResponse & { idToken?: string };

// type that is JWTResponse and SigninResponse
export type WebSigninResponse = WebJWTResponse &
  SigninResponse & {
    refresh_expire_in?: number;
  };

export type BeforeRequestHook = Extract<
  CoreSdkConfig['hooks']['beforeRequest'],
  Function
>;
export type AfterRequestHook = Extract<
  CoreSdkConfig['hooks']['afterRequest'],
  Function
>;

export type { UserResponse, PasskeyOptions } from '@descope/core-js-sdk';

export type CustomStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};
