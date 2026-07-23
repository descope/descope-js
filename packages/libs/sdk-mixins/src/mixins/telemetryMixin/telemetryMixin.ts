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

// Human-readable delay formatter. Picks the largest unit that fits so logs
// read as "30 minutes" / "2 days" instead of "1800 seconds" / "172800 seconds".
function formatDelay(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} seconds`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minutes`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hours`;
  return `${Math.floor(h / 24)} days`;
}

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

      async #initializeTelemetry(
        config: Config['telemetry'],
        context: {
          projectId: string;
          flowId?: string;
          version?: string;
        },
      ) {
        if (!config?.enabled) {
          this.logger.debug('Telemetry is disabled, skipping initialization');
          return;
        }

        if (this.#telemetryInitialized) {
          this.logger.debug('Telemetry already initialized');
          return;
        }

        if (config.expiration && Date.now() >= config.expiration) {
          this.logger.info(
            `Telemetry expiration time has passed (${new Date(
              config.expiration,
            ).toISOString()}), skipping initialization`,
          );
          return;
        }

        try {
          this.logger.debug('Initializing telemetry...');
          const version = config.version || 'latest';

          await this.injectNpmLib(DEBUG_LOGS_LIB_NAME, version, JS_FILE_PATH, [
            LOCAL_STORAGE_OVERRIDE,
          ]);

          const TelemetryManager = window.DescopeDebugLogs;
          if (!TelemetryManager) {
            throw new Error(
              'DescopeDebugLogs not found after loading @descope/debug-logs. ' +
                'This likely means the UMD build failed to load from CDN.',
            );
          }

          this.#telemetryManager = new TelemetryManager(
            {
              enabled: true,
              rumConfig: config.rumConfig,
              capture: config.capture,
            },
            {
              projectId: context.projectId,
              flowId: context.flowId,
              version: context.version || '1.0.0',
            },
            this.logger,
          );
          this.#telemetryInitialized = true;

          this.logger.info('Telemetry initialized successfully');

          if (config.expiration) {
            this.#scheduleExpirationShutdown(config.expiration);
          }
        } catch (error) {
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
          this.logger.info('Telemetry expiration time reached, shutting down');
          this.#shutdownTelemetry();
          return;
        }

        // setTimeout's max safe delay is ~24.8 days; cap at 1 day so a
        // mis-set expiration far in the future doesn't underflow to 0.
        const MAX_TIMEOUT = 86400000;
        const delay = Math.min(timeUntilExpiration, MAX_TIMEOUT);

        if (timeUntilExpiration > MAX_TIMEOUT) {
          this.logger.warn(
            `Telemetry expiration is beyond maximum timeout (${formatDelay(
              timeUntilExpiration,
            )}). Setting to maximum.`,
          );
        }

        this.logger.info(
          `Telemetry will expire at ${new Date(
            expirationMs,
          ).toISOString()} (in ${formatDelay(delay)})`,
        );

        this.#expirationTimeoutId = setTimeout(() => {
          this.logger.info('Telemetry expiration time reached, shutting down');
          this.#shutdownTelemetry();
        }, delay);
      }

      #shutdownTelemetry() {
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

      async #getTelemetryConfig(): Promise<Config['telemetry']> {
        // Prefer telemetry config shipped by the backend in the project's
        // config.json. Otherwise, fall back to values from
        // packages/sdks/web-component/.env (DESCOPE_TELEMETRY_* — substituted
        // at WC build time via rollup.config.app.mjs). We MERGE rather than
        // replace so the backend can override individual fields (e.g. just
        // expiration) without re-stating every credential.
        const beTelemetry = (await this.config)?.telemetry;

        const sampleRate = Number(
          process.env.DESCOPE_TELEMETRY_SESSION_SAMPLE_RATE,
        );

        const fallback: NonNullable<Config['telemetry']> = {
          enabled:
            (process.env.DESCOPE_TELEMETRY_ENABLED || '').toLowerCase() ===
            'true',
          rumConfig: {
            applicationId: process.env.DESCOPE_TELEMETRY_APPLICATION_ID || '',
            identityPoolId:
              process.env.DESCOPE_TELEMETRY_IDENTITY_POOL_ID || '',
            region: process.env.DESCOPE_TELEMETRY_REGION || '',
            sessionSampleRate:
              Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : 1,
            ...(process.env.DESCOPE_TELEMETRY_GUEST_ROLE_ARN && {
              guestRoleArn: process.env.DESCOPE_TELEMETRY_GUEST_ROLE_ARN,
            }),
          },
        };

        const cfg: NonNullable<Config['telemetry']> = {
          ...fallback,
          ...beTelemetry,
          rumConfig: {
            ...fallback.rumConfig,
            ...beTelemetry?.rumConfig,
          },
          capture: this.#resolveCapture(beTelemetry?.capture),
        };

        // If enabled but a required RUM credential is missing (empty from both
        // the BE block and the .env fallback), disable rather than hand AwsRum
        // an empty applicationId/identityPoolId/region — that would either
        // throw at construction or silently no-op with no session recorded.
        if (
          cfg.enabled &&
          (!cfg.rumConfig?.applicationId ||
            !cfg.rumConfig?.identityPoolId ||
            !cfg.rumConfig?.region)
        ) {
          this.logger.warn(
            'Telemetry enabled but rumConfig is incomplete (applicationId/identityPoolId/region required). Skipping initialization.',
          );
          cfg.enabled = false;
        }

        // Safety cap: when no backend telemetry config is present at all,
        // end the session after 5 minutes so dev sessions don't leak. Once
        // the backend owns the config it controls expiration explicitly.
        if (!beTelemetry) {
          cfg.expiration = Date.now() + 5 * 60 * 1000;
        }

        return cfg;
      }

      /**
       * The backend can't serialize a DOM element reference, so we always
       * inject this.shadowRoot here. Respect an explicit `dom: false`.
       */
      #resolveCapture(
        beCapture: NonNullable<Config['telemetry']>['capture'],
      ): NonNullable<Config['telemetry']>['capture'] {
        const domSetting = beCapture?.dom;
        if (domSetting === false) {
          return {
            console: true,
            network: { urlFilter: [] },
            navigation: true,
            ...beCapture,
            dom: false,
          };
        }
        return {
          console: true,
          network: { urlFilter: [] },
          navigation: true,
          ...beCapture,
          dom: {
            throttleMs: 2000,
            ...(typeof domSetting === 'object' ? domSetting : {}),
            rootElement: this.shadowRoot as any,
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
