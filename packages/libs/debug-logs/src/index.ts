// Direct import and default export - better compatibility with Rollup UMD
import { TelemetryManager } from './telemetryManager';
export default TelemetryManager;

// Re-export types for TypeScript consumers
export type { Logger } from './telemetryManager';
export type { TelemetryConfig, TelemetryContext } from './types';
export type { ConsoleLevel } from './plugins/consolePlugin';
