import createCoreSdk, { JWTResponse } from '@descope/core-js-sdk';
import { SigninResponse } from 'oidc-client-ts';

type Head<T extends ReadonlyArray<any>> = T extends readonly [] ? never : T[0];

export type OidcConfigOptions = {
  applicationId?: string;
  // default is current URL
  redirectUri?: string;
  // default is openid email roles descope.custom_claims offline_access
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
