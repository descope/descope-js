import { telemetryMixin } from '../src';
import {
  DEBUG_LOGS_LIB_NAME,
  JS_FILE_PATH,
  LOCAL_STORAGE_OVERRIDE,
} from '../src/mixins/telemetryMixin/constants';

type TelemetryTestInstance = {
  logger: {
    debug: jest.Mock;
    info: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
  };
  injectNpmLib: jest.Mock;
  telemetryManager: { shutdown: jest.Mock; updateContext: jest.Mock } | null;
  updateTelemetryContext: (context: Record<string, any>) => void;
  init: () => Promise<void>;
  disconnectedCallback: () => void;
};

const OriginalMutationObserver = global.MutationObserver;
const TELEMETRY_ENV_DEFAULTS: Record<string, string> = {
  DESCOPE_TELEMETRY_ENABLED: 'true',
  DESCOPE_TELEMETRY_APPLICATION_ID: 'test-app',
  DESCOPE_TELEMETRY_IDENTITY_POOL_ID: 'test-pool',
  DESCOPE_TELEMETRY_REGION: 'test-region',
};

function snapshotEnv(keys: string[]): () => void {
  const snapshot: Record<string, string | undefined> = {};
  keys.forEach((k) => {
    snapshot[k] = process.env[k];
  });
  return () => {
    keys.forEach((k) => {
      if (snapshot[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = snapshot[k];
      }
    });
  };
}

let restoreTelemetryEnv: (() => void) | null = null;

beforeAll(() => {
  global.MutationObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof MutationObserver;
  // telemetryMixin#getTelemetryConfig reads enabled + fallback rumConfig from
  // process.env.DESCOPE_TELEMETRY_* (substituted into the WC bundle at build
  // time). Seed them here so every test runs with telemetry on and with
  // enough creds to pass the missing-creds guard. The Config fallback + merge
  // describe overrides per-test as needed.
  restoreTelemetryEnv = snapshotEnv(Object.keys(TELEMETRY_ENV_DEFAULTS));
  Object.entries(TELEMETRY_ENV_DEFAULTS).forEach(([k, v]) => {
    process.env[k] = v;
  });
});

afterAll(() => {
  global.MutationObserver = OriginalMutationObserver;
  restoreTelemetryEnv?.();
});

const createTelemetryHost = () => {
  class BaseElement {
    shadowRoot: HTMLElement | null = document.createElement('div');
    attributes: Array<{ name: string; value: string }> = [];

    async init() {}

    getAttribute(): string | null {
      return null;
    }
  }

  const TelemetryHost = telemetryMixin(
    BaseElement as unknown as CustomElementConstructor,
  );
  const instance = new TelemetryHost() as unknown as TelemetryTestInstance &
    Record<string, any>;

  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };
  instance.logger = logger;
  const wrappedLogger = instance.logger;

  instance.injectNpmLib = jest.fn().mockResolvedValue(undefined);
  (instance as any).onReset = jest.fn().mockReturnValue(() => {});

  let configValue: any = {
    telemetry: {
      enabled: true,
    },
  };

  Object.defineProperty(instance, 'config', {
    get: () => Promise.resolve(configValue),
    configurable: true, // Allow reconfiguration in tests
  });

  Object.defineProperty(instance, 'projectId', {
    get: () => 'proj-123',
  });

  Object.defineProperty(instance, 'flowId', {
    get: () => 'flow-456',
  });

  (instance as any).sdkVersion = '9.9.9';
  instance.shadowRoot = document.createElement('div');

  return { instance, logger, wrappedLogger, configValue };
};

describe('telemetryMixin', () => {
  let telemetryManagerMock: { shutdown: jest.Mock; updateContext: jest.Mock };
  let TelemetryManagerCtor: jest.Mock;

  beforeEach(() => {
    telemetryManagerMock = {
      shutdown: jest.fn(),
      updateContext: jest.fn(),
    };

    TelemetryManagerCtor = jest
      .fn()
      .mockImplementation(() => telemetryManagerMock);

    window.DescopeDebugLogs = TelemetryManagerCtor as any;
  });

  afterEach(() => {
    delete window.DescopeDebugLogs;
    jest.clearAllMocks();
  });

  it('initializes telemetry on init()', async () => {
    const { instance, logger, wrappedLogger } = createTelemetryHost();

    await instance.init();
    await (instance as any).telemetryReady;

    expect(instance.injectNpmLib).toHaveBeenCalledWith(
      DEBUG_LOGS_LIB_NAME,
      'latest',
      JS_FILE_PATH,
      [LOCAL_STORAGE_OVERRIDE],
    );

    expect(TelemetryManagerCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        capture: expect.objectContaining({
          dom: expect.objectContaining({
            throttleMs: 2000,
          }),
        }),
      }),
      expect.objectContaining({
        projectId: 'proj-123',
        flowId: 'flow-456',
        version: '9.9.9',
      }),
      wrappedLogger,
    );

    expect(logger.info).toHaveBeenCalledWith(
      'Telemetry initialized successfully',
    );
    expect(instance.telemetryManager).toBe(telemetryManagerMock);
  });

  it('does not reinitialize once telemetry is ready', async () => {
    const { instance, logger } = createTelemetryHost();

    await instance.init();
    await (instance as any).telemetryReady;
    await instance.init();
    await (instance as any).telemetryReady;

    expect(instance.injectNpmLib).toHaveBeenCalledTimes(1);
    expect(TelemetryManagerCtor).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenLastCalledWith(
      'Telemetry already initialized',
    );
  });

  it('logs an error when TelemetryManager global is missing', async () => {
    const { instance, logger } = createTelemetryHost();
    delete window.DescopeDebugLogs;

    await instance.init();
    await (instance as any).telemetryReady;

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to initialize telemetry:',
      expect.any(Error),
    );
    expect(instance.telemetryManager).toBeNull();
  });

  it('updates telemetry context through the manager', async () => {
    const { instance } = createTelemetryHost();

    await instance.init();
    await (instance as any).telemetryReady;

    instance.updateTelemetryContext({ locale: 'en-US' });

    expect(telemetryManagerMock.updateContext).toHaveBeenCalledWith({
      locale: 'en-US',
    });
  });

  it('shuts down telemetry in disconnectedCallback()', async () => {
    const { instance, logger } = createTelemetryHost();

    await instance.init();
    await (instance as any).telemetryReady;
    instance.disconnectedCallback();

    expect(telemetryManagerMock.shutdown).toHaveBeenCalledTimes(1);
    expect(instance.telemetryManager).toBeNull();
    expect(logger.info).toHaveBeenCalledWith('Telemetry shutdown complete');
  });

  describe('Telemetry Expiration', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should skip initialization if expiration has passed', async () => {
      const { instance, logger, configValue } = createTelemetryHost();

      // Set expiration to 1 hour ago
      const pastExpiration = Date.now() - 60 * 60 * 1000;
      configValue.telemetry = {
        enabled: true,
        expiration: pastExpiration,
      };

      await instance.init();
      await (instance as any).telemetryReady;

      expect(instance.injectNpmLib).not.toHaveBeenCalled();
      expect(TelemetryManagerCtor).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Telemetry expiration time has passed'),
      );
    });

    it('should initialize and schedule shutdown if expiration is in future', async () => {
      const { instance, logger, configValue } = createTelemetryHost();

      // Set expiration to 30 minutes from now
      const futureExpiration = Date.now() + 30 * 60 * 1000;
      configValue.telemetry = {
        enabled: true,
        expiration: futureExpiration,
      };

      await instance.init();
      await (instance as any).telemetryReady;

      expect(TelemetryManagerCtor).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Telemetry will expire at'),
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('in 30 minutes'),
      );
    });

    it('should automatically shutdown when expiration time is reached', async () => {
      const { instance, logger, configValue } = createTelemetryHost();

      // Set expiration to 5 minutes from now
      const futureExpiration = Date.now() + 5 * 60 * 1000;
      configValue.telemetry = {
        enabled: true,
        expiration: futureExpiration,
      };

      await instance.init();
      await (instance as any).telemetryReady;

      expect(instance.telemetryManager).toBe(telemetryManagerMock);

      // Fast-forward time to expiration
      jest.advanceTimersByTime(5 * 60 * 1000);

      expect(telemetryManagerMock.shutdown).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Telemetry expiration time reached, shutting down',
      );
    });

    it('should handle expiration beyond max timeout (1 day)', async () => {
      const { instance, logger, configValue } = createTelemetryHost();

      // Set expiration to 2 days from now
      const futureExpiration = Date.now() + 2 * 24 * 60 * 60 * 1000;
      configValue.telemetry = {
        enabled: true,
        expiration: futureExpiration,
      };

      await instance.init();
      await (instance as any).telemetryReady;

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Telemetry expiration is beyond maximum timeout',
        ),
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('2 days'),
      );
    });

    it('should clear expiration timeout on disconnectedCallback', async () => {
      const { instance, configValue } = createTelemetryHost();

      // Set expiration to 30 minutes from now
      const futureExpiration = Date.now() + 30 * 60 * 1000;
      configValue.telemetry = {
        enabled: true,
        expiration: futureExpiration,
      };

      await instance.init();
      await (instance as any).telemetryReady;

      // Disconnect before expiration
      instance.disconnectedCallback();

      // Fast-forward past expiration
      jest.advanceTimersByTime(30 * 60 * 1000);

      // Shutdown should only be called once (from disconnectedCallback, not from timeout)
      expect(telemetryManagerMock.shutdown).toHaveBeenCalledTimes(1);
    });

    it('should work without expiration field (indefinite)', async () => {
      const { instance, logger, configValue } = createTelemetryHost();

      configValue.telemetry = {
        enabled: true,
        // No expiration field
      };

      await instance.init();
      await (instance as any).telemetryReady;

      expect(TelemetryManagerCtor).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Telemetry initialized successfully',
      );
      expect(logger.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Telemetry will expire at'),
      );
    });
  });

  describe('Config fallback + merge', () => {
    const MERGE_ENV_KEYS = [
      'DESCOPE_TELEMETRY_APPLICATION_ID',
      'DESCOPE_TELEMETRY_IDENTITY_POOL_ID',
      'DESCOPE_TELEMETRY_REGION',
      'DESCOPE_TELEMETRY_GUEST_ROLE_ARN',
      'DESCOPE_TELEMETRY_SESSION_SAMPLE_RATE',
    ];
    let restore: (() => void) | null = null;

    beforeEach(() => {
      restore = snapshotEnv(MERGE_ENV_KEYS);
    });

    afterEach(() => {
      restore?.();
    });

    it('uses env-driven rumConfig when BE ships no rumConfig', async () => {
      process.env.DESCOPE_TELEMETRY_APPLICATION_ID = 'env-app';
      process.env.DESCOPE_TELEMETRY_IDENTITY_POOL_ID = 'env-pool';
      process.env.DESCOPE_TELEMETRY_REGION = 'env-region';
      process.env.DESCOPE_TELEMETRY_SESSION_SAMPLE_RATE = '0.5';

      const { instance, configValue } = createTelemetryHost();
      configValue.telemetry = { enabled: true };

      await instance.init();
      await (instance as any).telemetryReady;

      expect(TelemetryManagerCtor).toHaveBeenCalledWith(
        expect.objectContaining({
          rumConfig: expect.objectContaining({
            applicationId: 'env-app',
            identityPoolId: 'env-pool',
            region: 'env-region',
            sessionSampleRate: 0.5,
          }),
        }),
        expect.anything(),
        expect.anything(),
      );
    });

    it('BE rumConfig wins per-key, env fills the gaps', async () => {
      process.env.DESCOPE_TELEMETRY_APPLICATION_ID = 'env-app';
      process.env.DESCOPE_TELEMETRY_IDENTITY_POOL_ID = 'env-pool';
      process.env.DESCOPE_TELEMETRY_REGION = 'env-region';

      const { instance, configValue } = createTelemetryHost();
      configValue.telemetry = {
        enabled: true,
        rumConfig: {
          applicationId: 'be-app',
        },
      };

      await instance.init();
      await (instance as any).telemetryReady;

      expect(TelemetryManagerCtor).toHaveBeenCalledWith(
        expect.objectContaining({
          rumConfig: expect.objectContaining({
            applicationId: 'be-app',
            identityPoolId: 'env-pool',
            region: 'env-region',
          }),
        }),
        expect.anything(),
        expect.anything(),
      );
    });

    it('skips initialization when required RUM credentials are missing', async () => {
      // Both BE block and env leave applicationId/identityPoolId/region empty
      delete process.env.DESCOPE_TELEMETRY_APPLICATION_ID;
      delete process.env.DESCOPE_TELEMETRY_IDENTITY_POOL_ID;
      delete process.env.DESCOPE_TELEMETRY_REGION;

      const { instance, logger, configValue } = createTelemetryHost();
      configValue.telemetry = { enabled: true };

      await instance.init();
      await (instance as any).telemetryReady;

      expect(TelemetryManagerCtor).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('rumConfig is incomplete'),
      );
    });
  });
});
