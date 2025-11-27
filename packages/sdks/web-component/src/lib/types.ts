/* istanbul ignore file */

import type { JWTResponse } from '@descope/web-js-sdk';
import { createSdk } from '@descope/web-js-sdk';

export type SdkConfig = Parameters<typeof createSdk>[0];
export type Sdk = ReturnType<typeof createSdk>;

export type SdkFlowNext = Sdk['flow']['next'];

export type ComponentsDynamicAttrs = {
  attributes: Record<string, any>;
};

export type ComponentsConfig = Record<string, any> & {
  componentsDynamicAttrs?: Record<string, ComponentsDynamicAttrs>;
};
export type CssVars = Record<string, any>;

type KeepArgsByIndex<F, Indices extends readonly number[]> = F extends (
  ...args: infer A
) => infer R
  ? (...args: PickArgsByIndex<A, Indices>) => R
  : never;

type PickArgsByIndex<
  All extends readonly any[],
  Indices extends readonly number[],
> = {
  [K in keyof Indices]: Indices[K] extends keyof All ? All[Indices[K]] : never;
};

type Project = {
  name: string;
};

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
  cssVars?: CssVars;
  form?: Record<string, string>;
  inputs?: Record<string, string>; // Backward compatibility
  lastAuth?: LastAuthState;
  project?: Project;
  totp?: { image?: string; provisionUrl?: string };
  notp?: { image?: string; redirectUrl?: string };
  selfProvisionDomains?: unknown;
  user?: unknown;
  sso?: unknown;
  dynamicSelects?: unknown;
  keysInUse?: unknown;
  genericForm?: unknown;
  linkId?: unknown;
  sentTo?: unknown;
  clientScripts?: ClientScript[];
}

export type SSOQueryParams = {
  oidcIdpStateId?: string;
  samlIdpStateId?: string;
  samlIdpUsername?: string;
  descopeIdpInitiated?: boolean;
  ssoAppId?: string;
  thirdPartyAppId: string;
  thirdPartyAppStateId?: string;
  applicationScopes?: string;
} & OIDCOptions;

export type OIDCOptions = {
  oidcLoginHint?: string;
  oidcPrompt?: string;
  oidcErrorRedirectUri?: string;
  oidcResource?: string;
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
  stepName: string;
  executionId: string;
  action: string;
  redirectTo: string;
  redirectIsPopup: boolean;
  openInNewTabUrl?: string;
  redirectUrl: string;
  screenId: string;
  screenState: ScreenState;
  token: string;
  code: string;
  isPopup: boolean;
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
  nativeResponseType: string;
  nativePayload: Record<string, any>;
  reqTimestamp: number;
} & SSOQueryParams;

export type StepState = {
  screenState: ScreenState;
  screenId: string;
  stepName: string;
  htmlFilename: string;
  htmlLocaleFilename: string;
  next: NextFn;
  direction: Direction | undefined;
  samlIdpUsername: string;
  action?: string;
} & OIDCOptions;

export type CustomScreenState = Omit<
  ScreenState,
  'cssVars' | 'componentsConfig' | 'inputs'
> & {
  error?: {
    text: ScreenState['errorText'];
    type: ScreenState['errorType'];
  };
  action?: string;
  inboundAppApproveScopes?: {
    desc: string;
    id: string;
    required: boolean;
  }[];
};

export type DebugState = {
  isDebug: boolean;
};

export interface ScriptElement extends HTMLDivElement {
  moduleRes?: ScriptModule;
}

export type ScriptModule = {
  /**
   * Unique identifier of the module.
   */
  id: string;
  /**
   * Notifies the module that it should start any profiling or monitoring.
   */
  start?: () => void;
  /**
   * Notifies the module that it should stop any profiling or monitoring.
   */
  stop?: () => void;
  /**
   * Presents the user with any required interaction to get a refreshed token or state,
   * e.g., a challenge or captcha.
   *
   * Modules should return a value of true if the presentation completed successfully,
   * false if it was cancelled by the user, and throw an error in case of failure.
   *
   * This is called before form submission (via a next call) after a button click.
   */
  present?: () => Promise<boolean>;
  /**
   * Refreshes any tokens or state that might be needed before form submission.
   *
   * Modules should throw an error in case of failure.
   */
  refresh?: () => Promise<void>;
};

export type ClientScript = {
  id: string;
  initArgs: Record<string, any>;
  resultKey?: string;
};

export type NextFn = KeepArgsByIndex<SdkFlowNext, [2, 5]> & {
  isCustomScreen?: boolean;
};
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
  | 'greater-than-or-equal'
  | 'less-than'
  | 'less-than-or-equal'
  | 'empty'
  | 'not-empty'
  | 'is-true'
  | 'is-false'
  | 'in'
  | 'not-in'
  | 'in-range'
  | 'not-in-range'
  | 'devised-by';

export interface ClientConditionResult {
  screenId: string;
  screenName: string;
  clientScripts?: ClientScript[];
  componentsConfig?: ComponentsConfig;
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
  lastAuth?: LastAuthState;
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
  startScreenName?: string;
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
  clientScripts?: ClientScript[];
  componentsConfig?: ComponentsConfig;
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

export type FlowStatus = 'loading' | 'error' | 'success' | 'ready' | 'initial';

export type CustomStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export type FlowJWTResponse = JWTResponse & {
  flowOutput?: Record<string, any>;
};
