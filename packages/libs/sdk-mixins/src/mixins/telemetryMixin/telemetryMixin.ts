import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { injectNpmLibMixin } from '../injectNpmLibMixin';
import { loggerMixin } from '../loggerMixin';
import { Config } from '../configMixin/types';
import {
  DEBUG_LOGS_LIB_NAME,
  JS_FILE_PATH,
  LOCAL_STORAGE_OVERRIDE,
} from './constants';
import { initLifecycleMixin } from '../initLifecycleMixin';
import { configMixin } from '../configMixin';
import { projectIdMixin } from '../projectIdMixin';
import { flowIdMixin } from '../flowIdMixin';

// Extend global window to include DescopeDebugLogs (UMD global)
declare global {
  interface Window {
    DescopeDebugLogs?: new (config: any, context: any, logger?: any) => any;
  }
}

export const telemetryMixin = createSingletonMixin(
  <T extends CustomElementConstructor & { sdkVersion?: string }>(
    superclass: T,
  ) => {
    const BaseClass = compose(
      injectNpmLibMixin,
      loggerMixin,
      initLifecycleMixin,
      configMixin,
      projectIdMixin,
      flowIdMixin,
    )(superclass);

    return class TelemetryMixinClass extends BaseClass {
      #telemetryManager: any = null;
      #telemetryInitialized = false;
      #expirationTimeoutId: NodeJS.Timeout | null = null;

      /**
       * Initialize telemetry if enabled in config
       * @param config - The configuration object
       * @param context - Context information (projectId, flowId, version)
       */
      async #initializeTelemetry(
        config: Config['telemetry'],
        context: {
          projectId: string;
          flowId?: string;
          version?: string;
        },
      ) {
        // Skip if telemetry not enabled
        if (!config?.enabled) {
          this.logger.debug('Telemetry is disabled, skipping initialization');
          return;
        }

        // Skip if already initialized
        if (this.#telemetryInitialized) {
          this.logger.debug('Telemetry already initialized');
          return;
        }

        // Check if telemetry has expired
        if (config.expiration) {
          const now = Date.now();
          if (now >= config.expiration) {
            this.logger.info(
              `Telemetry expiration time has passed (${new Date(
                config.expiration,
              ).toISOString()}), skipping initialization`,
            );
            return;
          }
        }

        try {
          this.logger.debug('Initializing telemetry...');

          // Load the debug-logs library from CDN
          // Use version from config, default to 'latest' if not provided
          const version = config.version || 'latest';

          await this.injectNpmLib(DEBUG_LOGS_LIB_NAME, version, JS_FILE_PATH, [
            LOCAL_STORAGE_OVERRIDE,
          ]);

          // Check if the library was loaded successfully
          // The UMD build exposes the TelemetryManager class directly as window.DescopeDebugLogs
          const TelemetryManager = window.DescopeDebugLogs;
          if (!TelemetryManager) {
            throw new Error(
              'DescopeDebugLogs not found after loading @descope/debug-logs. ' +
                'This likely means the UMD build failed to load from CDN.',
            );
          }

          // Build telemetry configuration
          const telemetryConfig = {
            enabled: true,
            rumConfig: {
              ...config.rumConfig,
              // Ensure sessionSampleRate has a default
              sessionSampleRate: config.rumConfig.sessionSampleRate ?? 1.0,
            },
            capture: config.capture || {},
          };

          // Build context for telemetry
          const telemetryContext = {
            projectId: context.projectId,
            flowId: context.flowId,
            version: context.version || '1.0.0',
          };

          // Initialize the telemetry manager
          // TelemetryManager(config, context, logger?)
          this.#telemetryManager = new TelemetryManager(
            telemetryConfig,
            telemetryContext,
            this.logger, // Pass logger for telemetry internal logging
          );
          this.#telemetryInitialized = true;

          this.logger.info('Telemetry initialized successfully');

          // Schedule automatic shutdown if expiration is set
          if (config.expiration) {
            this.#scheduleExpirationShutdown(config.expiration);
          }
        } catch (error) {
          // Fail silently - telemetry should never break the application
          this.logger.error('Failed to initialize telemetry:', error);
          this.#telemetryInitialized = false;
        }
      }

      /**
       * Schedule automatic telemetry shutdown at expiration time
       * @param expirationMs - Unix timestamp in milliseconds when telemetry should expire
       */
      #scheduleExpirationShutdown(expirationMs: number) {
        const now = Date.now();
        const timeUntilExpiration = expirationMs - now;

        if (timeUntilExpiration <= 0) {
          // Already expired, shutdown immediately
          this.logger.info('Telemetry expiration time reached, shutting down');
          this.#shutdownTelemetry();
          return;
        }

        // Limit timeout to 1 day (86400000 milliseconds)
        const MAX_TIMEOUT = 86400000;
        const delay = Math.min(timeUntilExpiration, MAX_TIMEOUT);

        if (timeUntilExpiration > MAX_TIMEOUT) {
          this.logger.warn(
            `Telemetry expiration is beyond maximum timeout (${Math.floor(
              timeUntilExpiration / 86400000,
            )} days). Setting to maximum.`,
          );
        }

        this.logger.info(
          `Telemetry will expire at ${new Date(
            expirationMs,
          ).toISOString()} (in ${Math.floor(delay / 1000)} seconds)`,
        );

        this.#expirationTimeoutId = setTimeout(() => {
          this.logger.info('Telemetry expiration time reached, shutting down');
          this.#shutdownTelemetry();
        }, delay);
      }

      /**
       * Shutdown telemetry and clean up resources
       */
      #shutdownTelemetry() {
        // Clear expiration timeout if exists
        if (this.#expirationTimeoutId) {
          clearTimeout(this.#expirationTimeoutId);
          this.#expirationTimeoutId = null;
        }

        if (this.#telemetryManager) {
          try {
            this.logger.debug('Shutting down telemetry...');
            this.#telemetryManager.shutdown();
            this.#telemetryManager = null;
            this.#telemetryInitialized = false;
            this.logger.info('Telemetry shutdown complete');
          } catch (error) {
            this.logger.error('Error shutting down telemetry:', error);
          }
        }
      }

      /**
       * Get the telemetry manager instance (for advanced usage)
       */
      get telemetryManager() {
        return this.#telemetryManager;
      }

      async #getTelemetryConfig() {
        const { telemetry } = (await this.config) || {};

        return {
          enabled: true,
          expiration: Date.now() + 5 * 60 * 1000, // 5 minutes from now
          rumConfig: {
            applicationId: '29ffa5ff-1d8b-4cc6-b464-9003ab8c52ba',
            identityPoolId: 'eu-west-1:9830bbf8-cb94-47d0-a7ef-48e5cde4a1c3',
            region: 'eu-west-1',
            sessionSampleRate: 1,
          },
          capture: {
            console: true,
            network: {
              urlFilter: [],
            },
            dom: {
              rootElement: this.shadowRoot as any,
              throttleMs: 2000,
            },
            navigation: true,
          },
        };
      }

      updateTelemetryContext(context: Record<string, any>) {
        if (this.#telemetryManager) {
          try {
            this.#telemetryManager.updateContext(context);
          } catch (error) {
            // Fail silently - telemetry errors should never break the web-component
            this.logger.error('Error updating telemetry context:', error);
          }
        }
      }

      async init() {
        const sdkVersion = (this as any).sdkVersion || '1.0.0';
        const config = await this.#getTelemetryConfig();

        await this.#initializeTelemetry(config as any, {
          projectId: this.projectId,
          flowId: this.flowId,
          version: sdkVersion,
        });

        await super.init?.();
      }

      disconnectedCallback() {
        super.disconnectedCallback?.();
        this.#shutdownTelemetry();
      }
    };
  },
);
