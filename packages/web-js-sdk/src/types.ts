import createCoreSdk from '@descope/core-js-sdk';

type Head<T extends ReadonlyArray<any>> = T extends readonly [] ? never : T[0];

// Replace specific param of a function in a specific index, with a new type
export type ReplaceParam<
  Args extends readonly any[],
  Idx extends keyof Args,
  NewType
> = {
  [K in keyof Args]: K extends Idx ? NewType : Args[K];
};

/** Descope Core SDK types */
export type CreateCoreSdk = typeof createCoreSdk;
export type CoreSdk = ReturnType<CreateCoreSdk>;
export type CoreSdkConfig = Head<Parameters<CreateCoreSdk>>;

export type BeforeRequestHook = Extract<
  CoreSdkConfig['hooks']['beforeRequest'],
  Function
>;
export type AfterRequestHook = Extract<
  CoreSdkConfig['hooks']['afterRequest'],
  Function
>;

export type { UserResponse } from '@descope/core-js-sdk';
