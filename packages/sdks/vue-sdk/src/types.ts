import createSdk from '@descope/web-js-sdk';
import type { Ref } from 'vue';

export type Options = {
  projectId: string;
  baseUrl?: string;
  baseStaticUrl?: string;
  baseCdnUrl?: string;
  // If true, tokens will be stored on local storage
  persistTokens?: boolean;
  sessionTokenViaCookie?: boolean | { sameSite: 'Strict' | 'Lax' | 'None' };
  // If true, last authenticated user will be stored on local storage and can accessed with getUser function
  storeLastAuthenticatedUser?: boolean;
};

export type Sdk = ReturnType<typeof createSdk>;

type FlowResponse = Awaited<ReturnType<Sdk['flow']['next']>>;

export type ErrorResponse = FlowResponse['error'];

export type JWTResponse = FlowResponse['data']['authInfo'];

export type UserData = Exclude<
  Awaited<ReturnType<Sdk['me']>>['data'],
  undefined
>;

type Session = {
  fetchSession: () => Promise<void>;
  isLoading: Ref<boolean | null>;
  session: Ref<string>;
  isFetchSessionWasNeverCalled: Ref<boolean>;
};

type User = {
  fetchUser: () => Promise<void>;
  isLoading: Ref<boolean | null>;
  user: Ref<UserData>;
  isFetchUserWasNeverCalled: Ref<boolean>;
};

export type Context = {
  options: Options;
  sdk: Sdk;
  user: User;
  session: Session;
};
