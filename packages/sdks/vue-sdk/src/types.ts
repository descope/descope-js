import createSdk, { CookieConfig } from '@descope/web-js-sdk';
import type { Ref } from 'vue';

export type Options = {
  projectId: string;
  baseUrl?: string;
  baseStaticUrl?: string;
  baseCdnUrl?: string;
  // Default is true. If true, tokens will be stored on local storage
  persistTokens?: boolean;
  // Default is true. If true, the SDK will automatically refresh the session token when it is about to expire
  autoRefresh?: boolean;
  sessionTokenViaCookie?: CookieConfig;
  // Default is true. If true, last authenticated user will be stored on local storage and can accessed with getUser function
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
  fetchSession: (tryRefresh?: boolean) => Promise<void>;
  isLoading: Ref<boolean | null>;
  session: Ref<string>;
  claims: Ref<JWTResponse['claims']>;
  isAuthenticated: Ref<boolean>;
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
  resetAuth: () => void;
};
