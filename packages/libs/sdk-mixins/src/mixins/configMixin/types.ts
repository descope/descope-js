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
};

export type ProjectConfiguration = {
  componentsVersion: string;
  cssTemplate: Style;
  flows: {
    [key: string]: FlowConfig; // dynamic key names for flows
  };
  styles: Record<string, Style>;
};

export type Config = {
  projectConfig: ProjectConfiguration;
  executionContext: {
    geo: string;
  };
};
