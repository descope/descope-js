import createCoreSdk, { JWTResponse } from '@descope/core-js-sdk';
import { SigninResponse } from 'oidc-client-ts';
import { OidcConfig } from './sdk/oidc';
type Head<T extends ReadonlyArray<any>> = T extends readonly [] ? never : T[0];

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
export type WebSdkConfig = CoreSdkConfig & { oidcConfig?: OidcConfig } // Extends with oidcConfig


/* JWT response might be an OIDC response */
// Asaf - think of better type composition
export type WebJWTResponse = JWTResponse & SigninResponse;

export type BeforeRequestHook = Extract<
  CoreSdkConfig['hooks']['beforeRequest'],
  Function
>;
export type AfterRequestHook = Extract<
  CoreSdkConfig['hooks']['afterRequest'],
  Function
>;


export type { UserResponse, PasskeyOptions } from '@descope/core-js-sdk';
