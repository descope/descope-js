import createSdk from './createSdk';

export type CreateSdk = typeof createSdk;
export type SdkConfig = Parameters<CreateSdk>[0];
