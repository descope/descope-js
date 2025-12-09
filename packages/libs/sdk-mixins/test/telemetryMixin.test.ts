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

beforeAll(() => {
  global.MutationObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof MutationObserver;
});

afterAll(() => {
  global.MutationObserver = OriginalMutationObserver;
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

  Object.defineProperty(instance, 'config', {
    get: () =>
      Promise.resolve({
        telemetry: {
          enabled: true,
        },
      }),
  });

  Object.defineProperty(instance, 'projectId', {
    get: () => 'proj-123',
  });

  Object.defineProperty(instance, 'flowId', {
    get: () => 'flow-456',
  });

  (instance as any).sdkVersion = '9.9.9';
  instance.shadowRoot = document.createElement('div');

  return { instance, logger, wrappedLogger };
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
    await instance.init();

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

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to initialize telemetry:',
      expect.any(Error),
    );
    expect(instance.telemetryManager).toBeNull();
  });

  it('updates telemetry context through the manager', async () => {
    const { instance } = createTelemetryHost();

    await instance.init();

    instance.updateTelemetryContext({ locale: 'en-US' });

    expect(telemetryManagerMock.updateContext).toHaveBeenCalledWith({
      locale: 'en-US',
    });
  });

  it('shuts down telemetry in disconnectedCallback()', async () => {
    const { instance, logger } = createTelemetryHost();

    await instance.init();
    instance.disconnectedCallback();

    expect(telemetryManagerMock.shutdown).toHaveBeenCalledTimes(1);
    expect(instance.telemetryManager).toBeNull();
    expect(logger.info).toHaveBeenCalledWith('Telemetry shutdown complete');
  });
});
