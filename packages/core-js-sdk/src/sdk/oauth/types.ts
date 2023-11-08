import { SdkResponse, URLResponse, JWTResponse, LoginOptions } from '../types';

enum OAuthProviders {
  facebook = 'facebook',
  github = 'github',
  google = 'google',
  microsoft = 'microsoft',
  gitlab = 'gitlab',
  apple = 'apple',
  discord = 'discord',
  linkedin = 'linkedin',
  slack = 'slack',
}

type VerifyFn = (code: string) => Promise<SdkResponse<JWTResponse>>;
export type StartFn = (
  redirectURL?: string,
  loginOptions?: LoginOptions,
  token?: string
) => Promise<SdkResponse<URLResponse>>;

export type Providers<T> = Record<keyof typeof OAuthProviders, T>;

export type Oauth = {
  start: Providers<StartFn>;
  verify: Providers<VerifyFn>;
};

export { OAuthProviders };
