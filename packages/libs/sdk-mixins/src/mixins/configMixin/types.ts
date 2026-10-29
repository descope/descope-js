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

type Style = {
  dark: ThemeTemplate;
  light: ThemeTemplate;
};

export type ClientScript = {
  id: string;
  initArgs: Record<string, any>;
  resultKey?: string;
};

export type ComponentsDynamicAttrs = {
  attributes: Record<string, any>;
};

export type ComponentsConfig = Record<string, any> & {
  componentsDynamicAttrs?: Record<string, ComponentsDynamicAttrs>;
};

export type ClientCondition = {
  operator: Operator;
  key: string;
  predicate?: string | number;
  met: ClientConditionResult;
  unmet?: ClientConditionResult;
};

export type ClientConditionResult = {
  screenId: string;
  screenName: string;
  clientScripts?: ClientScript[];
  interactionId: string;
  componentsConfig?: ComponentsConfig;
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
  // Per-flow switch for client-side validation error tracking. Absent means off.
  clientValidationTrackingEnabled?: boolean;
};

export type WidgetConfig = {
  allowSubTenants?: boolean;
  version?: number;
  targetLocales?: string[];
  // Where this widget runs its flows. Absent or 'modal' keeps them in a modal
  // on the app's own page; 'popup' runs them on the project's auth domain, so a
  // passkey is bound there and works from every app that signs in through it.
  // The backend only writes it when set, so absent means modal.
  flowTarget?: 'modal' | 'popup';
};

// RUM debug-telemetry config. The backend ships this inside the project's
// config.json under `projectConfig`; the top-level `Config.telemetry` is kept
// only as a fallback for older config shapes.
export type TelemetryConfig = {
  enabled: boolean;
  version?: string;
  expiration?: number; // Unix timestamp in milliseconds
  rumConfig: {
    sessionSampleRate: number;
    applicationId: string;
    identityPoolId: string;
    guestRoleArn?: string;
    region: string;
    endpoint?: string;
  };
  capture?: {
    console?:
      | boolean
      | { levels?: ('log' | 'info' | 'warn' | 'error' | 'debug')[] };
    network?: boolean | { urlFilter?: RegExp | RegExp[] };
    navigation?: boolean;
    dom?: boolean | { rootElement?: string | HTMLElement; throttleMs?: number };
  };
};

export type ProjectConfiguration = {
  componentsVersion: string;
  componentsVersionSri?: string;
  cssTemplate: Style;
  flows: {
    [key: string]: FlowConfig; // dynamic key names for flows
  };
  widgets?: {
    [key: string]: WidgetConfig; // dynamic key names for widgets
  };
  styles: Record<string, Style>;
  // Base url of the project's hosted auth page, e.g. https://auth.acme.com/login.
  // Only present when the project has its OWN custom domain - the backend
  // deliberately omits it otherwise rather than publishing the shared Descope
  // host, which would make the passkey relying party a host shared across
  // customers. Absent means popup mode cannot be used.
  hostedPageBaseUrl?: string;
  // The backend ships RUM debug-telemetry config nested here in config.json.
  telemetry?: TelemetryConfig;
};

export type Config = {
  projectConfig: ProjectConfiguration;
  executionContext: {
    geo: string;
  };
};
