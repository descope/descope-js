import { SdkResponse, URLResponse, JWTResponse } from '../types';

enum OAuthProviders {
  facebook = 'facebook',
  github = 'github',
  google = 'google',
  microsoft = 'microsoft',
  gitlab = 'gitlab',
  apple = 'apple',
  discord = 'discord',
  linkedin = 'linkedin',
}

type StartFn = <B extends { redirect: boolean }>(
  redirectURL?: string,
  config?: B
) => Promise<SdkResponse<URLResponse>>;
type VerifyFn = (code: string) => Promise<SdkResponse<JWTResponse>>;

type Providers<T> = Record<keyof typeof OAuthProviders, T>;

export type Oauth = {
  start: Providers<StartFn>;
  verify: Providers<VerifyFn>;
};

export { OAuthProviders };
