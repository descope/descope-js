import type { Plugin, PluginContext } from 'aws-rum-web';

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface ConsolePluginConfig {
  levels?: ConsoleLevel[];
}

/**
 * Console Plugin for AWS RUM
 * Records console.log/info/warn/error/debug calls as custom events
 */
export class ConsolePlugin implements Plugin {
  private context!: PluginContext;
  private enabled = false;
  private readonly id = 'console-plugin';
  private readonly levels: Set<ConsoleLevel>;

  private originalMethods = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  constructor(config: ConsolePluginConfig = {}) {
    // Default to all levels if not specified
    this.levels = new Set(
      config.levels || ['log', 'info', 'warn', 'error', 'debug'],
    );
  }

  load(context: PluginContext): void {
    this.context = context;
    this.enable();
  }

  enable(): void {
    if (this.enabled) return;
    this.enabled = true;

    // Intercept only configured console methods
    (['log', 'info', 'warn', 'error', 'debug'] as const).forEach((level) => {
      if (!this.levels.has(level)) return;

      console[level] = (...args: any[]) => {
        try {
          // Call original method first
          this.originalMethods[level](...args);

          // Record to RUM as custom event
          this.context.record('console_log', {
            level,
            message: args
              .map((arg) =>
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg),
              )
              .join(' '),
            timestamp: Date.now(),
          });
        } catch (error) {
          // Fail silently - just use original if recording fails
          this.originalMethods[level](...args);
        }
      };
    });
  }

  disable(): void {
    if (!this.enabled) return;
    this.enabled = false;

    // Restore only intercepted methods
    (['log', 'info', 'warn', 'error', 'debug'] as const).forEach((level) => {
      if (!this.levels.has(level)) return;
      console[level] = this.originalMethods[level];
    });
  }

  getPluginId(): string {
    return this.id;
  }
}
