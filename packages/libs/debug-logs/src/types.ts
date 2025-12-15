import type { ConsoleLevel } from './plugins/consolePlugin';

export interface NetworkCaptureConfig {
  urlFilter?: RegExp | RegExp[];
  maxHeaderLength?: number;
}

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
    network?: boolean | NetworkCaptureConfig;
    navigation?: boolean;
    dom?: boolean | { rootElement?: string | HTMLElement; throttleMs?: number };
  };
}

export interface TelemetryContext {
  projectId: string;
  flowId: string;
  version?: string;
}
