import TelemetryManager from '../src';
import type {
  Logger,
  TelemetryConfig,
  TelemetryContext,
} from '../src';

/**
 * Public API contract.
 *
 * The web-component SDK loads `@descope/debug-logs` from the CDN at RUNTIME,
 * pinned to `latest` (`config.version || 'latest'`). We keep `latest` on
 * purpose so telemetry logic can be adapted without redeploying every SDK -
 * which means a new release of this package is picked up by ALREADY-DEPLOYED
 * SDKs immediately.
 *
 * Therefore the public surface asserted here MUST stay backward compatible:
 * do not remove/rename these members, change the constructor shape, or drop an
 * exported type without a deliberate, coordinated change. If a break is
 * intended, updating this test is the explicit signal that consumers loading
 * `latest` will be affected.
 *
 * Also exported and part of the contract (verified by these imports compiling):
 * `NetworkCaptureConfig`, `ConsoleLevel`.
 */
describe('public API contract (deployed SDKs load @latest)', () => {
  const config: TelemetryConfig = {
    enabled: false, // false -> constructor does not build a RUM client
    rumConfig: {
      sessionSampleRate: 1,
      applicationId: 'app',
      identityPoolId: 'pool',
      region: 'eu-west-1',
    },
  };
  const context: TelemetryContext = { projectId: 'P1', flowId: 'sign-in' };

  it('default export is the TelemetryManager class', () => {
    expect(typeof TelemetryManager).toBe('function');
    expect(new TelemetryManager(config, context)).toBeInstanceOf(TelemetryManager);
  });

  it('constructor accepts (config, context, logger?)', () => {
    const logger: Logger = console;
    expect(() => new TelemetryManager(config, context, logger)).not.toThrow();
    expect(() => new TelemetryManager(config, context)).not.toThrow();
  });

  it('exposes the methods consumers depend on', () => {
    const tm = new TelemetryManager(config, context);
    for (const method of [
      'isReady',
      'shutdown',
      'enable',
      'disable',
      'updateContext',
      'getRumClient',
    ]) {
      expect(typeof (tm as unknown as Record<string, unknown>)[method]).toBe(
        'function',
      );
    }
  });
});
