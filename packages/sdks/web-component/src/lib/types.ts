/* istanbul ignore file */

import createSdk from '@descope/web-js-sdk';

export type SdkConfig = Parameters<typeof createSdk>[0];
export type Sdk = ReturnType<typeof createSdk>;

export type SdkFlowNext = Sdk['flow']['next'];

export type ComponentsConfig = Record<string, any>;

type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => infer R
  ? (...args: P) => R
  : never;

export enum Direction {
  backward = 'backward',
  forward = 'forward',
}

export interface LastAuthState {
  loginId?: string;
  name?: string;
}

export interface ScreenState {
  errorText?: string;
  errorType?: string;
  componentsConfig?: ComponentsConfig;
  form?: Record<string, string>;
  inputs?: Record<string, string>; // Backward compatibility
  lastAuth?: LastAuthState;
  totp?: { image?: string; provisionUrl?: string };
  notp?: { image?: string; redirectUrl?: string };
}

export type SSOQueryParams = {
  oidcIdpStateId?: string;
  samlIdpStateId?: string;
  samlIdpUsername?: string;
  descopeIdpInitiated?: boolean;
  ssoAppId?: string;
} & OIDCOptions;

export type OIDCOptions = {
  oidcLoginHint?: string;
  oidcPrompt?: string;
  oidcErrorRedirectUri?: string;
};

export type Locale = {
  locale: string;
  fallback: string;
};

export type FlowState = {
  flowId: string;
  projectId: string;
  baseUrl: string;
  tenant: string;
  stepId: string;
  executionId: string;
  action: string;
  redirectTo: string;
  openInNewTabUrl?: string;
  redirectUrl: string;
  screenId: string;
  screenState: ScreenState;
  token: string;
  code: string;
  exchangeError: string;
  webauthnTransactionId: string;
  webauthnOptions: string;
  redirectAuthCodeChallenge: string;
  redirectAuthCallbackUrl: string;
  redirectAuthBackupCallbackUri: string;
  redirectAuthInitiator: string;
  deferredRedirect: boolean;
  locale: string;
  samlIdpResponseUrl: string;
  samlIdpResponseSamlResponse: string;
  samlIdpResponseRelayState: string;
  nativePlatform: string;
  nativeOAuthProvider: string;
  nativeOAuthRedirect: string;
  nativeResponseType: string;
  nativePayload: Record<string, any>;
  webauthnOrigin: string;
} & SSOQueryParams;

export type StepState = {
  screenState: ScreenState;
  htmlUrl: string;
  htmlLocaleUrl: string;
  next: NextFn;
  direction: Direction | undefined;
  samlIdpUsername: string;
  openInNewTabUrl?: string;
} & OIDCOptions;

export type DebugState = {
  isDebug: boolean;
};

export type NextFn = OmitFirstArg<OmitFirstArg<SdkFlowNext>>;
export type NextFnReturnPromiseValue = Awaited<ReturnType<NextFn>>;

export type DebuggerMessage = {
  title: string;
  description?: string;
};

export type FlowStateUpdateFn = (state: FlowState) => void;

type Operator =
  | 'equal'
  | 'not-equal'
  | 'contains'
  | 'greater-than'
  | 'less-than'
  | 'empty'
  | 'not-empty'
  | 'is-true'
  | 'is-false'
  | 'in'
  | 'not-in';

export interface ClientConditionResult {
  screenId: string;
  interactionId: string;
}

export interface ClientCondition {
  operator: Operator;
  key: string;
  predicate?: string | number;
  met: ClientConditionResult;
  unmet?: ClientConditionResult;
}

export type AutoFocusOptions = true | false | 'skipFirstScreen';

export type ThemeOptions = 'light' | 'dark' | 'os';

export type Key =
  | 'lastAuth.loginId'
  | 'idpInitiated'
  | 'externalToken'
  | 'abTestingKey';

type CheckFunction = (ctx: Context, predicate?: string | number) => boolean;

export type ConditionsMap = {
  [key in Key]: {
    [operator in Operator]?: CheckFunction;
  };
};

export interface Context {
  loginId?: string;
  code?: string;
  token?: string;
  abTestingKey?: number;
}

export type DescopeUI = Record<string, () => Promise<void>> & {
  componentsThemeManager: Record<string, any>;
};

type Font = {
  family: string[];
  label: string;
  url?: string;
};

type ThemeTemplate = {
  fonts: {
    font1: Font;
    font2: Font;
  };
};

export type FlowConfig = {
  startScreenId?: string;
  version: number;
  targetLocales?: string[];
  conditions?: ClientCondition[];
  condition?: ClientCondition;
  fingerprintEnabled?: boolean;
  fingerprintKey?: string;
  sdkScripts?: [
    {
      id: string;
      initArgs: Record<string, any>;
      resultKey?: string;
    },
  ];
};

export interface ProjectConfiguration {
  componentsVersion: string;
  cssTemplate: {
    dark: ThemeTemplate;
    light: ThemeTemplate;
  };
  flows: {
    [key: string]: FlowConfig; // dynamic key names for flows
  };
}
