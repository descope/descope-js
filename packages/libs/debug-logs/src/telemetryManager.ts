import { AwsRum } from 'aws-rum-web';
import type { Plugin } from 'aws-rum-web';
import type { TelemetryConfig, TelemetryContext } from './types';
import { ConsolePlugin } from './plugins/consolePlugin';
import { NavigationPlugin } from './plugins/navigationPlugin';
import { DomMutationPlugin } from './plugins/domMutationPlugin';

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
      this.initializeRumClient();
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

    const networkConfig =
      typeof this.config.capture?.network === 'object'
        ? this.config.capture.network
        : {};

    const httpConfig: any = {
      recordAllRequests: true,
      addXRayTraceIdHeader: false,
      stackTraceLength: 200,
    };

    if (networkConfig.urlFilter) {
      const filters = Array.isArray(networkConfig.urlFilter)
        ? networkConfig.urlFilter
        : [networkConfig.urlFilter];

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
    return new AwsRum(
      this.config.rumConfig.applicationId,
      this.context.version || '1.0.0',
      this.config.rumConfig.region,
      {
        sessionSampleRate: this.config.rumConfig.sessionSampleRate,
        identityPoolId: this.config.rumConfig.identityPoolId,
        ...(this.config.rumConfig.guestRoleArn && {
          guestRoleArn: this.config.rumConfig.guestRoleArn,
        }),
        endpoint: this.config.rumConfig.endpoint,
        telemetries,
        eventPluginsToLoad,
        allowCookies: true,
        enableXRay: false,
      },
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
   * Check if telemetry is active and ready
   */
  isReady(): boolean {
    return !this.isShutdown && this.rumClient !== null;
  }

  /**
   * Get the underlying RUM client (for advanced usage)
   */
  getRumClient(): AwsRum | null {
    return this.rumClient;
  }
}
