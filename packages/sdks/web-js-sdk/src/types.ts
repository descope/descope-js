import createCoreSdk, { JWTResponse } from '@descope/core-js-sdk';
import { SigninResponse } from 'oidc-client-ts';

type Head<T extends ReadonlyArray<any>> = T extends readonly [] ? never : T[0];

export type OidcConfigOptions = {
  // For Federated Apps: the application ID
  applicationId?: string;
  // For Inbound Apps: the app's client ID.
  // When provided without a custom issuer, the SDK automatically constructs
  // the authority URL as `{baseUrl}/v1/apps/{projectId}`.
  inboundAppClientId?: string;
  // Client ID for OIDC. Required when a custom issuer is provided.
  clientId?: string;
  // Custom issuer/authority URL. If provided, clientId is required.
  issuer?: string;
  // OAuth 2.0 Resource Indicators (RFC 8707).
  // Specifies the resource(s) the access token should be scoped to.
  // Pass a single URI string or an array of URI strings.
  resource?: string | string[];
  // default is current URL
  redirectUri?: string;
  // default is 'openid email roles descope.custom_claims offline_access'
  // default is 'openid' if a custom issuer/clientId is provided
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
