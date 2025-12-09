/**
 * Unit tests for TelemetryManager
 */

import { TelemetryManager } from '../src/telemetryManager';
import type { TelemetryConfig, TelemetryContext } from '../src/types';
import { MockAwsRum, mockAddSessionAttributes, mockDisable } from './setup';

describe('TelemetryManager', () => {
  let manager: TelemetryManager;
  let mockLogger: { debug: jest.Mock; error: jest.Mock };
  let validConfig: TelemetryConfig;
  let validContext: TelemetryContext;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
    };

    validConfig = {
      enabled: true,
      rumConfig: {
        applicationId: 'test-app-id',
        identityPoolId: 'us-east-1:test-pool-id',
        region: 'us-east-1',
        sessionSampleRate: 1.0,
      },
      capture: {
        console: true,
        network: true,
        navigation: true,
        dom: true,
      },
    };

    validContext = {
      projectId: 'test-project',
      flowId: 'test-flow',
      version: '1.0.0',
    };
  });

  afterEach(() => {
    manager?.shutdown();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize when enabled', () => {
      manager = new TelemetryManager(validConfig, validContext, mockLogger);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '✅ Telemetry initialized successfully',
      );
      expect(manager.isReady()).toBe(true);
    });

    it('should not initialize when disabled', () => {
      const disabledConfig = { ...validConfig, enabled: false };
      manager = new TelemetryManager(disabledConfig, validContext, mockLogger);

      expect(mockLogger.debug).toHaveBeenCalledWith('Telemetry is disabled');
      expect(manager.isReady()).toBe(false);
    });

    it('should use console as default logger', () => {
      manager = new TelemetryManager(validConfig, validContext);

      expect(manager).toBeDefined();
    });

    it('should handle initialization errors gracefully', () => {
      const invalidConfig = {
        ...validConfig,
        rumConfig: { ...validConfig.rumConfig, region: undefined as any },
      };

      // Constructor throws on initialization failure
      expect(() => {
        manager = new TelemetryManager(invalidConfig, validContext, mockLogger);
      }).toThrow();

      // Should have logged error before throwing
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should add session attributes on initialization', () => {
      manager = new TelemetryManager(validConfig, validContext, mockLogger);

      expect(mockAddSessionAttributes).toHaveBeenCalledWith({
        projectId: 'test-project',
        flowId: 'test-flow',
      });
    });

    it('should use version from context', () => {
      const contextWithVersion = { ...validContext, version: '2.5.0' };
      manager = new TelemetryManager(
        validConfig,
        contextWithVersion,
        mockLogger,
      );

      const rumClient = manager.getRumClient();
      expect(rumClient).toBeInstanceOf(MockAwsRum);
      expect((rumClient as unknown as MockAwsRum).version).toBe('2.5.0');
    });

    it('should default to version 1.0.0 if not provided', () => {
      const contextWithoutVersion = {
        projectId: 'test',
        flowId: 'test',
      };
      manager = new TelemetryManager(
        validConfig,
        contextWithoutVersion,
        mockLogger,
      );

      const rumClient = manager.getRumClient();
      expect((rumClient as unknown as MockAwsRum).version).toBe('1.0.0');
    });
  });

  describe('RUM Client Configuration', () => {
    it('should create RUM client with correct parameters', () => {
      manager = new TelemetryManager(validConfig, validContext, mockLogger);

      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      expect(rumClient.appId).toBe('test-app-id');
      expect(rumClient.version).toBe('1.0.0');
      expect(rumClient.region).toBe('us-east-1');
    });

    it('should include guestRoleArn if provided', () => {
      const configWithRole = {
        ...validConfig,
        rumConfig: {
          ...validConfig.rumConfig,
          guestRoleArn: 'arn:aws:iam::123456789:role/GuestRole',
        },
      };

      manager = new TelemetryManager(configWithRole, validContext, mockLogger);

      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      expect(rumClient.config.guestRoleArn).toBe(
        'arn:aws:iam::123456789:role/GuestRole',
      );
    });

    it('should omit guestRoleArn if not provided', () => {
      manager = new TelemetryManager(validConfig, validContext, mockLogger);

      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      expect(rumClient.config.guestRoleArn).toBeUndefined();
    });

    it('should include custom endpoint if provided', () => {
      const configWithEndpoint = {
        ...validConfig,
        rumConfig: {
          ...validConfig.rumConfig,
          endpoint: 'https://custom-endpoint.example.com',
        },
      };

      manager = new TelemetryManager(
        configWithEndpoint,
        validContext,
        mockLogger,
      );

      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      expect(rumClient.config.endpoint).toBe(
        'https://custom-endpoint.example.com',
      );
    });
  });

  describe('HTTP Telemetry Configuration', () => {
    it('should enable HTTP telemetry by default', () => {
      manager = new TelemetryManager(validConfig, validContext, mockLogger);

      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      const telemetries = rumClient.config.telemetries;

      expect(telemetries).toContainEqual(
        expect.arrayContaining(['http', expect.any(Object)]),
      );
    });

    it('should disable HTTP telemetry when network capture is false', () => {
      const configNoNetwork = {
        ...validConfig,
        capture: { ...validConfig.capture, network: false },
      };

      manager = new TelemetryManager(configNoNetwork, validContext, mockLogger);

      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      const telemetries = rumClient.config.telemetries;

      const hasHttp = telemetries.some((t: any) =>
        Array.isArray(t) ? t[0] === 'http' : t === 'http',
      );
      expect(hasHttp).toBe(false);
    });

    it('should configure URL filtering for HTTP telemetry', () => {
      const configWithFilter = {
        ...validConfig,
        capture: {
          ...validConfig.capture,
          network: { urlFilter: [/^https:\/\/api\./] },
        },
      };

      manager = new TelemetryManager(
        configWithFilter,
        validContext,
        mockLogger,
      );

      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      const httpConfig = rumClient.config.telemetries.find(
        (t: any) => Array.isArray(t) && t[0] === 'http',
      );

      expect(httpConfig).toBeDefined();
      expect(httpConfig[1].recordResourceUrl).toBeInstanceOf(Function);
    });

    it('should handle single URL filter', () => {
      const configWithSingleFilter = {
        ...validConfig,
        capture: {
          ...validConfig.capture,
          network: { urlFilter: /^https:\/\/api\./ },
        },
      };

      manager = new TelemetryManager(
        configWithSingleFilter,
        validContext,
        mockLogger,
      );

      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      const httpConfig = rumClient.config.telemetries.find(
        (t: any) => Array.isArray(t) && t[0] === 'http',
      );

      expect(httpConfig[1].recordResourceUrl('https://api.example.com')).toBe(
        true,
      );
      expect(httpConfig[1].recordResourceUrl('https://other.com')).toBe(false);
    });

    it('should handle multiple URL filters with OR logic', () => {
      const configWithFilters = {
        ...validConfig,
        capture: {
          ...validConfig.capture,
          network: {
            urlFilter: [/^https:\/\/api\./, /^https:\/\/cdn\./],
          },
        },
      };

      manager = new TelemetryManager(
        configWithFilters,
        validContext,
        mockLogger,
      );

      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      const httpConfig = rumClient.config.telemetries.find(
        (t: any) => Array.isArray(t) && t[0] === 'http',
      );

      expect(httpConfig[1].recordResourceUrl('https://api.example.com')).toBe(
        true,
      );
      expect(httpConfig[1].recordResourceUrl('https://cdn.example.com')).toBe(
        true,
      );
      expect(httpConfig[1].recordResourceUrl('https://other.com')).toBe(false);
    });

    it('should always include errors telemetry', () => {
      manager = new TelemetryManager(validConfig, validContext, mockLogger);

      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      expect(rumClient.config.telemetries).toContain('errors');
    });
  });

  describe('Plugin Configuration', () => {
    it('should load all plugins when capture is true', () => {
      manager = new TelemetryManager(validConfig, validContext, mockLogger);

      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      const plugins = rumClient.config.eventPluginsToLoad;

      expect(plugins).toHaveLength(3);
      expect(plugins[0].getPluginId()).toBe('console-plugin');
      expect(plugins[1].getPluginId()).toBe('navigation-plugin');
      expect(plugins[2].getPluginId()).toBe('dom-mutation-plugin');
    });

    it('should not load console plugin when disabled', () => {
      const configNoConsole = {
        ...validConfig,
        capture: { ...validConfig.capture, console: false },
      };

      manager = new TelemetryManager(configNoConsole, validContext, mockLogger);

      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      const plugins = rumClient.config.eventPluginsToLoad;

      const hasConsole = plugins.some(
        (p: any) => p.getPluginId() === 'console-plugin',
      );
      expect(hasConsole).toBe(false);
    });

    it('should not load navigation plugin when disabled', () => {
      const configNoNav = {
        ...validConfig,
        capture: { ...validConfig.capture, navigation: false },
      };

      manager = new TelemetryManager(configNoNav, validContext, mockLogger);

      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      const plugins = rumClient.config.eventPluginsToLoad;

      const hasNav = plugins.some(
        (p: any) => p.getPluginId() === 'navigation-plugin',
      );
      expect(hasNav).toBe(false);
    });

    it('should not load DOM plugin when disabled', () => {
      const configNoDom = {
        ...validConfig,
        capture: { ...validConfig.capture, dom: false },
      };

      manager = new TelemetryManager(configNoDom, validContext, mockLogger);

      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      const plugins = rumClient.config.eventPluginsToLoad;

      const hasDom = plugins.some(
        (p: any) => p.getPluginId() === 'dom-mutation-plugin',
      );
      expect(hasDom).toBe(false);
    });

    it('should pass config to console plugin', () => {
      const configWithLevels = {
        ...validConfig,
        capture: {
          ...validConfig.capture,
          console: { levels: ['error', 'warn'] as any },
        },
      };

      manager = new TelemetryManager(
        configWithLevels,
        validContext,
        mockLogger,
      );

      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      const consolePlugin = rumClient.config.eventPluginsToLoad[0];

      expect(consolePlugin).toBeDefined();
      expect(consolePlugin.getPluginId()).toBe('console-plugin');
    });

    it('should pass config to DOM plugin', () => {
      const configWithDom = {
        ...validConfig,
        capture: {
          ...validConfig.capture,
          dom: {
            rootElement: '#custom-root',
            throttleMs: 500,
          },
        },
      };

      manager = new TelemetryManager(configWithDom, validContext, mockLogger);

      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      const domPlugin = rumClient.config.eventPluginsToLoad.find(
        (p: any) => p.getPluginId() === 'dom-mutation-plugin',
      );

      expect(domPlugin).toBeDefined();
    });
  });

  describe('Shutdown', () => {
    beforeEach(() => {
      manager = new TelemetryManager(validConfig, validContext, mockLogger);
      mockLogger.debug.mockClear();
    });

    it('should shutdown RUM client', () => {
      manager.shutdown();

      expect(mockDisable).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Telemetry shutdown complete',
      );
    });

    it('should mark instance as shutdown', () => {
      manager.shutdown();

      expect(manager.isReady()).toBe(false);
    });

    it('should clear RUM client reference', () => {
      manager.shutdown();

      expect(manager.getRumClient()).toBeNull();
    });

    it('should disable all plugins', () => {
      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      const plugins = rumClient.config.eventPluginsToLoad;

      const disableSpy = jest.spyOn(plugins[0], 'disable');

      manager.shutdown();

      expect(disableSpy).toHaveBeenCalled();
    });

    it('should not shutdown twice', () => {
      manager.shutdown();
      mockDisable.mockClear();
      mockLogger.debug.mockClear();

      manager.shutdown();

      expect(mockDisable).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Telemetry already shutdown',
      );
    });

    it('should handle shutdown errors gracefully', () => {
      mockDisable.mockImplementation(() => {
        throw new Error('Shutdown failed');
      });

      expect(() => {
        manager.shutdown();
      }).not.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to shutdown telemetry:',
        expect.any(Error),
      );
    });
  });

  describe('Enable/Disable', () => {
    beforeEach(() => {
      manager = new TelemetryManager(validConfig, validContext, mockLogger);
      mockLogger.debug.mockClear();
    });

    it('should disable plugins', () => {
      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      const plugin = rumClient.config.eventPluginsToLoad[0];
      const disableSpy = jest.spyOn(plugin, 'disable');

      manager.disable();

      expect(disableSpy).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Telemetry disabled');
    });

    it('should re-enable plugins', () => {
      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      const plugin = rumClient.config.eventPluginsToLoad[0];
      const enableSpy = jest.spyOn(plugin, 'enable');

      manager.disable();
      enableSpy.mockClear();

      manager.enable();

      expect(enableSpy).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Telemetry enabled');
    });

    it('should not enable after shutdown', () => {
      manager.shutdown();
      mockLogger.error.mockClear();

      manager.enable();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Cannot enable: Telemetry has been shutdown. Create a new instance.',
      );
    });

    it('should not disable after shutdown', () => {
      manager.shutdown();
      mockLogger.error.mockClear();

      manager.disable();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Cannot disable: Telemetry has been shutdown. Create a new instance.',
      );
    });

    it('should handle enable errors gracefully', () => {
      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      const plugin = rumClient.config.eventPluginsToLoad[0];

      jest.spyOn(plugin, 'enable').mockImplementation(() => {
        throw new Error('Enable failed');
      });

      // The enable method currently doesn't wrap in try-catch, so it will throw
      // This test documents current behavior
      expect(() => {
        manager.enable();
      }).toThrow('Enable failed');
    });
  });

  describe('isReady', () => {
    it('should return true when initialized', () => {
      manager = new TelemetryManager(validConfig, validContext, mockLogger);

      expect(manager.isReady()).toBe(true);
    });

    it('should return false when disabled', () => {
      const disabledConfig = { ...validConfig, enabled: false };
      manager = new TelemetryManager(disabledConfig, validContext, mockLogger);

      expect(manager.isReady()).toBe(false);
    });

    it('should return false after shutdown', () => {
      manager = new TelemetryManager(validConfig, validContext, mockLogger);
      manager.shutdown();

      expect(manager.isReady()).toBe(false);
    });
  });

  describe('getRumClient', () => {
    it('should return RUM client instance', () => {
      manager = new TelemetryManager(validConfig, validContext, mockLogger);

      const client = manager.getRumClient();

      expect(client).toBeInstanceOf(MockAwsRum);
    });

    it('should return null when not initialized', () => {
      const disabledConfig = { ...validConfig, enabled: false };
      manager = new TelemetryManager(disabledConfig, validContext, mockLogger);

      expect(manager.getRumClient()).toBeNull();
    });

    it('should return null after shutdown', () => {
      manager = new TelemetryManager(validConfig, validContext, mockLogger);
      manager.shutdown();

      expect(manager.getRumClient()).toBeNull();
    });
  });

  describe('Config Normalization', () => {
    it('should handle boolean true as empty object config', () => {
      const configWithBooleans = {
        ...validConfig,
        capture: {
          console: true,
          network: true,
          navigation: true,
          dom: true,
        },
      };

      manager = new TelemetryManager(
        configWithBooleans,
        validContext,
        mockLogger,
      );

      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      expect(rumClient.config.eventPluginsToLoad).toHaveLength(3);
    });

    it('should handle object configs with specific settings', () => {
      const configWithObjects = {
        ...validConfig,
        capture: {
          console: { levels: ['error'] as any },
          network: { urlFilter: [/api/, /admin/] },
          navigation: true,
          dom: { throttleMs: 200 },
        },
      };

      manager = new TelemetryManager(
        configWithObjects,
        validContext,
        mockLogger,
      );

      expect(manager.isReady()).toBe(true);
    });

    it('should handle missing capture config', () => {
      const configNoCap = {
        enabled: true,
        rumConfig: validConfig.rumConfig,
      };

      manager = new TelemetryManager(
        configNoCap as TelemetryConfig,
        validContext,
        mockLogger,
      );

      // Should still initialize, just with defaults
      expect(manager.isReady()).toBe(true);
    });
  });
});
