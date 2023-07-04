/* istanbul ignore file */

import createSdk from '@descope/web-js-sdk';

export type SdkConfig = Parameters<typeof createSdk>[0];
export type Sdk = ReturnType<typeof createSdk>;

export type SdkFlowNext = Sdk['flow']['next'];

type OmitFirstArg<F> = F extends (x: any, ...args: infer P) => infer R
  ? (...args: P) => R
  : never;

export type FlowConfig = {
  startScreenId?: string;
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
  form?: Record<string, string>;
  inputs?: Record<string, string>; // Backward compatibility
  lastAuth?: LastAuthState;
  totp?: { image?: string; provisionUrl?: string };
}

export type FlowState = {
  flowId: string;
  projectId: string;
  baseUrl: string;
  tenant: string;
  stepId: string;
  executionId: string;
  action: string;
  redirectTo: string;
  redirectUrl: string;
  screenId: string;
  screenState: ScreenState;
  token: string;
  code: string;
  exchangeError: string;
  webauthnTransactionId: string;
  webauthnOptions: string;
  telemetryKey: string;
  redirectAuthCodeChallenge: string;
  redirectAuthCallbackUrl: string;
  redirectAuthInitiator: string;
  oidcIdpStateId: string;
  deferredRedirect: boolean;
};

export type StepState = {
  screenState: ScreenState;
  htmlUrl: string;
  next: NextFn;
  direction: Direction | undefined;
};

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
  met: ClientConditionResult;
  unmet?: ClientConditionResult;
}

export type AutoFocusOptions = true | false | 'skipFirstScreen';

export type ThemeOptions = 'light' | 'dark' | 'os';

export type Key = 'lastAuth.loginId' | 'idpInitiated';

type CheckFunction = (ctx: Context) => boolean;

export type ConditionsMap = {
  [key in Key]: {
    [operator in Operator]?: CheckFunction;
  };
};

export interface Context {
  loginId?: string;
  code?: string;
}
