import { AwsRum } from 'aws-rum-web';
import type { Plugin } from 'aws-rum-web';
import type { TelemetryConfig, TelemetryContext } from './types';
import { ConsolePlugin } from './plugins/consolePlugin';
import { NavigationPlugin } from './plugins/navigationPlugin';
import { DomMutationPlugin } from './plugins/domMutationPlugin';
import { NetworkPlugin } from './plugins/networkPlugin';

function normalizeConfig<T extends Record<string, any>>(
  value: boolean | T | undefined,
): T | {} | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'object') {
    return value;
  }

  // value is true
  return {};
}

export interface Logger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

/**
 * TelemetryManager - Class-based telemetry management for AWS CloudWatch RUM
 *
 * Manages the lifecycle of AWS RUM client and custom plugins for telemetry collection.
 *
 * Note: Initialization happens in the constructor. Once shutdown() is called,
 * the instance cannot be reused - create a new instance instead.
 */
export class TelemetryManager {
  private rumClient: AwsRum | null = null;
  private plugins: Plugin[] = [];
  private config: TelemetryConfig;
  private context: TelemetryContext;
  private logger: Logger;
  private isShutdown = false;
  private initializationFailed = false;

  constructor(
    config: TelemetryConfig,
    context: TelemetryContext,
    logger: Logger = console,
  ) {
    this.config = config;
    this.context = context;
    this.logger = logger;

    // Initialize immediately if enabled
    if (config.enabled) {
      try {
        this.initializeRumClient();
      } catch (error) {
        this.initializationFailed = true;
        this.logger.error('Telemetry initialization failed:', error);
        // Don't re-throw - telemetry should never break the application
      }
    } else {
      this.logger.debug('Telemetry is disabled');
    }
  }

  /**
   * Initialize the RUM client and plugins
   */
  private initializeRumClient(): void {
    try {
      // Build telemetries and plugins
      const httpTelemetry = this.buildHttpTelemetry();
      const telemetries = [...httpTelemetry, 'errors'];
      const eventPluginsToLoad = this.buildCustomPlugins();

      // Create and configure RUM client
      this.rumClient = this.createRumClient(telemetries, eventPluginsToLoad);

      // Add custom context
      this.rumClient.addSessionAttributes({
        projectId: this.context.projectId,
        flowId: this.context.flowId,
      });

      // Enable all plugins
      this.plugins.forEach((plugin) => {
        plugin.enable();
      });

      // info-level so it shows in DevTools without enabling Verbose. Useful
      // for grabbing the sessionId and finding the session in CloudWatch RUM.
      const sessionId = this.tryGetSessionId();
      this.logger.info(
        `TelemetryManager: RUM client ready (sessionId=${
          sessionId ?? 'unknown'
        })`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize telemetry:', error);
      // Re-throw to be caught by constructor - this marks initialization as failed
      throw error;
    }
  }

  /**
   * Build HTTP telemetry configuration
   */
  private buildHttpTelemetry(): any[] {
    if (this.config.capture?.network === false) {
      return [];
    }

    const httpConfig: any = {
      recordAllRequests: true,
      addXRayTraceIdHeader: false,
      stackTraceLength: 200,
    };

    const urlFilter = (<any>this.config.capture?.network)?.urlFilter;
    if (urlFilter) {
      const filters = Array.isArray(urlFilter) ? urlFilter : [urlFilter];

      httpConfig.recordResourceUrl = (url: string) => {
        return filters.some((filter) => filter.test(url));
      };
    }

    return [['http', httpConfig]];
  }

  /**
   * Build all custom event plugins
   */
  private buildCustomPlugins(): Plugin[] {
    const plugins: Plugin[] = [];

    if (this.config.capture?.console !== false) {
      const config = normalizeConfig(this.config.capture?.console);
      plugins.push(new ConsolePlugin(config));
    }

    if (this.config.capture?.navigation !== false) {
      plugins.push(new NavigationPlugin());
    }

    if (this.config.capture?.network !== false) {
      const config = normalizeConfig(this.config.capture?.network);
      plugins.push(new NetworkPlugin(config));
    }

    if (this.config.capture?.dom !== false) {
      const config = normalizeConfig(this.config.capture?.dom);
      plugins.push(new DomMutationPlugin(config));
    }

    // Store plugins for lifecycle management
    this.plugins.push(...plugins);

    return plugins;
  }

  /**
   * Create AWS RUM client instance
   */
  private createRumClient(
    telemetries: any[],
    eventPluginsToLoad: Plugin[],
  ): AwsRum {
    const rumConfig = {
      endpoint: this.config.rumConfig.endpoint,
      telemetries,
      eventPluginsToLoad,
      allowCookies: true,
      enableXRay: false,
      // Increase limits to prevent hitting session/batch caps
      sessionEventLimit: 10000, // Max events per session (default: 200)
      batchLimit: 500, // Max events per batch/request (default: 100)
      eventCacheSize: 2000, // Max events in cache before dropping (default: 200)
      dispatchInterval: 5000, // Dispatch every 5 seconds (default: 10s)
      ...this.config.rumConfig,
    };

    this.logger.debug('Creating RUM client with config:', rumConfig);

    return new AwsRum(
      this.config.rumConfig.applicationId,
      this.context.version || '1.0.0',
      this.config.rumConfig.region,
      rumConfig,
    );
  }

  /**
   * Shutdown the telemetry manager and cleanup resources.
   * After calling shutdown, this instance cannot be reused.
   */
  shutdown(): void {
    if (this.isShutdown) {
      this.logger.debug('Telemetry already shutdown');
      return;
    }
    // Flip the flag BEFORE the work so a mid-shutdown throw doesn't leave the
    // instance in a half-shutdown state that repeat callers can re-enter.
    this.isShutdown = true;
    // Isolate each step in its own safe() so a throw in one (e.g. rumClient
    // disable) doesn't skip the others (e.g. plugin observers left running).
    this.safe('shutdown rum client', () => {
      if (this.rumClient) {
        this.rumClient.disable();
        this.rumClient = null;
      }
    });
    this.plugins.forEach((plugin) => {
      this.safe('disable plugin', () => plugin.disable());
    });
    this.plugins = [];
    this.logger.debug('Telemetry shutdown complete');
  }

  enable(): void {
    if (!this.assertMutable('enable')) return;
    this.safe('enable', () => {
      this.plugins.forEach((plugin) => plugin.enable());
      this.logger.debug('Telemetry enabled');
    });
  }

  disable(): void {
    if (!this.assertMutable('disable')) return;
    this.safe('disable', () => {
      this.plugins.forEach((plugin) => plugin.disable());
      this.logger.debug('Telemetry disabled');
    });
  }

  updateContext(
    context: Partial<Record<string, string | number | boolean>>,
  ): void {
    if (!this.assertMutable('update telemetry context')) return;
    this.safe('update telemetry context', () => {
      const filteredContext = Object.fromEntries(
        Object.entries(context).filter(([, value]) => value !== undefined),
      ) as { [key: string]: string | number | boolean };
      this.context = { ...this.context, ...filteredContext };
      this.rumClient!.addSessionAttributes(filteredContext);
      this.logger.debug('Telemetry context updated:', filteredContext);
    });
  }

  isReady(): boolean {
    return (
      !this.isShutdown && !this.initializationFailed && this.rumClient !== null
    );
  }

  getRumClient(): AwsRum | null {
    return this.rumClient;
  }

  private assertMutable(op: string): boolean {
    if (this.initializationFailed) {
      this.logger.error(`Cannot ${op}: telemetry initialization failed`);
      return false;
    }
    if (this.isShutdown) {
      this.logger.error(
        `Cannot ${op}: telemetry has been shutdown. Create a new instance.`,
      );
      return false;
    }
    if (!this.rumClient) {
      this.logger.error(`Cannot ${op}: telemetry not initialized`);
      return false;
    }
    return true;
  }

  private safe(op: string, fn: () => void): void {
    try {
      fn();
    } catch (error) {
      this.logger.error(`Failed to ${op}:`, error);
    }
  }

  /**
   * aws-rum-web does not expose a public getSessionId(); the session lives
   * inside the private eventCache. Reach in for debug logging only — keep
   * this strictly best-effort.
   */
  private tryGetSessionId(): string | null {
    try {
      return (
        (this.rumClient as any)?.eventCache?.getSession?.()?.sessionId ?? null
      );
    } catch {
      return null;
    }
  }
}
