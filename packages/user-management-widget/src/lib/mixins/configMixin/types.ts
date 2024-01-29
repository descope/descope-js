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

export interface ClientCondition {
  operator: Operator;
  key: string;
  predicate?: string | number;
  met: ClientConditionResult;
  unmet?: ClientConditionResult;
}

export interface ClientConditionResult {
  screenId: string;
  interactionId: string;
}

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

export type FlowConfig = {
  startScreenId?: string;
  version: number;
  targetLocales?: string[];
  conditions?: ClientCondition[];
  condition?: ClientCondition;
  fingerprintEnabled?: boolean;
  fingerprintKey?: string;
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
