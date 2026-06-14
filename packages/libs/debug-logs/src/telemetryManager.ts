import { AwsRum } from 'aws-rum-web';
import type { Plugin } from 'aws-rum-web';
import type { TelemetryConfig, TelemetryContext } from './types';
import { ConsolePlugin } from './plugins/consolePlugin';
import { NavigationPlugin } from './plugins/navigationPlugin';
import { DomMutationPlugin } from './plugins/domMutationPlugin';
import { NetworkPlugin } from './plugins/networkPlugin';
import type { NetworkCaptureConfig } from './types';

export interface Logger {
  debug: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

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

      this.logger.debug('✅ Telemetry initialized successfully');
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

    try {
      if (this.rumClient) {
        this.rumClient.disable();
        this.rumClient = null;
      }

      // Disable all plugins
      this.plugins.forEach((plugin) => {
        plugin.disable();
      });
      this.plugins = [];

      this.isShutdown = true;
      this.logger.debug('Telemetry shutdown complete');
    } catch (error) {
      this.logger.error('Failed to shutdown telemetry:', error);
    }
  }

  /**
   * Enable telemetry collection (re-enable plugins)
   */
  enable(): void {
    if (this.initializationFailed) {
      this.logger.error('Cannot enable: Telemetry initialization failed');
      return;
    }

    if (this.isShutdown) {
      this.logger.error(
        'Cannot enable: Telemetry has been shutdown. Create a new instance.',
      );
      return;
    }

    if (!this.rumClient) {
      this.logger.error('Cannot enable: Telemetry not initialized');
      return;
    }

    this.plugins.forEach((plugin) => {
      plugin.enable();
    });
    this.logger.debug('Telemetry enabled');
  }

  /**
   * Disable telemetry collection (disable plugins)
   */
  disable(): void {
    if (this.initializationFailed) {
      this.logger.error('Cannot disable: Telemetry initialization failed');
      return;
    }

    if (this.isShutdown) {
      this.logger.error(
        'Cannot disable: Telemetry has been shutdown. Create a new instance.',
      );
      return;
    }

    if (!this.rumClient) {
      this.logger.error('Cannot disable: Telemetry not initialized');
      return;
    }

    this.plugins.forEach((plugin) => {
      plugin.disable();
    });
    this.logger.debug('Telemetry disabled');
  }

  /**
   * Update the telemetry context with new values.
   * This adds or overwrites session attributes that will be included in all subsequent events.
   *
   * @param context - Partial context to update (e.g., { screenId: 'login', executionId: '123' })
   */
  updateContext(
    context: Partial<Record<string, string | number | boolean>>,
  ): void {
    if (this.initializationFailed) {
      this.logger.error(
        'Cannot update context: Telemetry initialization failed.',
      );
      return;
    }

    if (this.isShutdown) {
      this.logger.error('Cannot update context: Telemetry has been shutdown.');
      return;
    }

    if (!this.rumClient) {
      this.logger.error('Cannot update context: Telemetry not initialized');
      return;
    }

    try {
      // Filter out undefined values to satisfy AWS RUM type requirements
      const filteredContext = Object.fromEntries(
        Object.entries(context).filter(([, value]) => value !== undefined),
      ) as { [key: string]: string | number | boolean };

      // Update internal context reference
      this.context = { ...this.context, ...filteredContext };

      // Update RUM session attributes - these will be included in all subsequent events
      this.rumClient.addSessionAttributes(filteredContext);

      this.logger.debug('Telemetry context updated:', filteredContext);
    } catch (error) {
      // Fail silently - telemetry should never break the application
      this.logger.error('Failed to update telemetry context:', error);
    }
  }

  /**
   * Check if telemetry is active and ready
   */
  isReady(): boolean {
    return (
      !this.isShutdown && !this.initializationFailed && this.rumClient !== null
    );
  }

  /**
   * Get the underlying RUM client (for advanced usage)
   */
  getRumClient(): AwsRum | null {
    return this.rumClient;
  }
}
