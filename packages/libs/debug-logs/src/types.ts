import type { ConsoleLevel } from './plugins/consolePlugin';

export interface TelemetryConfig {
  enabled: boolean;
  rumConfig: {
    sessionSampleRate: number;
    applicationId: string;
    identityPoolId: string;
    guestRoleArn?: string; // Optional - only for classic flow, not enhanced flow
    region: string;
    endpoint?: string;
  };
  capture?: {
    console?: boolean | { levels?: ConsoleLevel[] };
    network?: boolean | { urlFilter?: RegExp | RegExp[] };
    navigation?: boolean;
    dom?: boolean | { rootElement?: string | HTMLElement; throttleMs?: number };
  };
}

export interface TelemetryContext {
  projectId: string;
  flowId: string;
  version?: string;
}
