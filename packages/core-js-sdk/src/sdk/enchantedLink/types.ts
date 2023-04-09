import { Deliveries, SdkResponse, EnchantedLinkResponse, User } from '../types';

export type EnchantedLinkSignInFn = (
  loginId: string,
  uri: string
) => Promise<SdkResponse<EnchantedLinkResponse>>;
export type EnchantedLinkSignUpFn = (
  loginId: string,
  uri: string,
  user?: User
) => Promise<SdkResponse<EnchantedLinkResponse>>;

export enum Routes {
  signUp = 'signup',
  signIn = 'signin',
  updatePhone = 'updatePhone',
}

export type EnchantedLink = {
  [Routes.signIn]: EnchantedLinkSignInFn;
  [Routes.signUp]: EnchantedLinkSignUpFn;
};

/** Polling configuration for session waiting */
export type WaitForSessionConfig = {
  pollingIntervalMs: number;
  timeoutMs: number;
};
