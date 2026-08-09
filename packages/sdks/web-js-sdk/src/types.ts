import createCoreSdk, { JWTResponse } from '@descope/core-js-sdk';
import { SigninResponse } from 'oidc-client-ts';

type Head<T extends ReadonlyArray<any>> = T extends readonly [] ? never : T[0];

export type OidcConfigOptions = {
  applicationId?: string;
  // Client ID for OIDC. Required when `issuer` is a non-federated (e.g. inbound-app)
  // authority. If `issuer` is a Federated App's discovery/authority URL, this defaults to
  // the project ID and only needs to be set to override it.
  clientId?: string;
  // Custom issuer/authority URL - paste the discovery/authority URL of either a Federated
  // App or an Inbound App as-is, including a full well-known URL
  // (`.../.well-known/openid-configuration`), which is automatically normalized to the bare
  // issuer. Which kind of app it is gets auto-detected from the URL shape; see `clientId`.
  issuer?: string;
  // default is current URL
  redirectUri?: string;
  // default is openid email roles descope.custom_claims offline_access
  // default is 'openid' if issuer resolves to a non-federated (e.g. inbound-app) authority
  scope?: string;
  // RFC 8707 resource indicator(s) requested at sign-in and on refresh.
  // Applies to both federated (applicationId) and inbound (issuer) apps.
  resource?: string | string[];
  // Alias for `resource` - RFC 8707 resource indicator(s). If both `resource` and
  // `audience` are supplied, `resource` wins. Provided for callers coming from an
  // `audience`-based OAuth/OIDC vocabulary; the wire parameter sent is always `resource`.
  audience?: string | string[];
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
