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

export type LastAuthState = NonNullable<
  NextFnReturnPromiseValue['data']['lastAuth']
> & {
  loginId?: string;
  name?: string;
  lastUsedPerScreen?: Record<string, string>;
};

export type RealtimeOperandKind = 'value' | 'form' | 'list';

// Operators the SDK is allowed to evaluate locally. The server's
// clientSupportedRealtimeOperators must stay in sync — anything outside this
// list is pre-evaluated server-side and shipped as a value operand.
//
// is-email / is-phone are intentionally absent: the server validates them
// with dedicated libraries (contact.IsValid*); the client has no equivalent,
// so the server keeps these CCs server-only.
export type RealtimeOperator =
  | 'equal'
  | 'not-equal'
  | 'contains'
  | 'doesnt-contains'
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
  | 'matches';

export interface RealtimeOperand {
  kind: RealtimeOperandKind;
  // Form is the context key the client looks up from the live form snapshot
  // (e.g. "form.phone"). Set only when kind === 'form'.
  form?: string;
  // Items is the operand list when kind === 'list'. Each element is a nested
  // operand — either a form placeholder or a resolved literal. Used when the
  // server detects an `in` / `not-in` / `contains` predicate whose array
  // contains `{{form.X}}` references; the client resolves them at eval time.
  items?: RealtimeOperand[];
  // Pre-resolved literal. Set only when kind === 'value', and may legitimately
  // be false / 0 / "" — do not treat absence as "no value" without checking
  // kind first.
  value?: unknown;
}

export interface RealtimeAtomicCondition {
  operator: RealtimeOperator;
  target?: RealtimeOperand;
  predicate?: RealtimeOperand;
}

export interface RealtimeRule {
  logicalOr?: boolean;
  atomicConditions: RealtimeAtomicCondition[];
}

export interface RealtimeComponentsCondition {
  id?: string;
  componentIds: string[];
  action: string;
  rules: RealtimeRule[];
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
  // map of component IDs to their state — the FULL last-wins verdict over
  // all CCs (server-only + client-eligible) the BE evaluated at screen-init.
  // Used by `applyComponentsState` for the first DOM paint.
  componentsState?: Record<string, string>;
  // Subset of `componentsState` contributed by SERVER-ONLY CCs — those the
  // client cannot re-evaluate locally (operators on the server-only
  // allow-list like `is-email`, or rules referencing context the client
  // doesn't have). Parallels `componentsState` in structure but excludes
  // contributions from client-eligible CCs that also ship in
  // `realtimeComponentsConditions`.
  //
  // The realtime layer uses this as the fallback action to restore when a
  // realtime CC stops firing on a touched component — without it the SDK
  // can't tell whether the action in `componentsState` came from a
  // server-only CC (must persist) or from a realtime CC also re-shipped
  // (must clear).
  //
  // Absent on old backends; new SDKs fall back to a legacy heuristic that
  // infers the same information from `componentsState`, so the old-BE /
  // new-SDK combination still works correctly.
  serverOnlyComponentsState?: Record<string, string>;
  // Client-evaluable visibility conditions, populated only by new backends.
  // Absent on old backends; new SDKs ignore when absent.
  realtimeComponentsConditions?: RealtimeComponentsCondition[];
}

export type SSOQueryParams = {
  oidcIdpStateId?: string;
  samlIdpStateId?: string;
  wsfedIdpStateId?: string;
  samlIdpUsername?: string;
  descopeIdpInitiated?: boolean;
  ssoAppId?: string;
  customAppId?: string;
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
  deferredPolling: boolean;
  locale: string;
  samlIdpResponseUrl: string;
  samlIdpResponseSamlResponse: string;
  samlIdpResponseRelayState: string;
  wsFedIdpResponseUrl: string;
  wsFedIdpResponseWresult: string;
  wsFedIdpResponseWctx: string;
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
  locale?: string;
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

type ThemeColor = {
  main: string;
  dark: string;
  light: string;
  highlight: string;
  contrast: string;
};

export type OverrideTheme = {
  globals?: {
    colors?: {
      primary?: ThemeColor;
      secondary?: ThemeColor;
    };
  };
};

export type OverrideThemes = {
  dark?: OverrideTheme;
  light?: OverrideTheme;
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
