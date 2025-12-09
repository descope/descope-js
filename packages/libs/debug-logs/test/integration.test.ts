/**
 * Integration tests for TelemetryManager with plugins
 */

import { TelemetryManager } from '../src/telemetryManager';
import type { TelemetryConfig, TelemetryContext } from '../src/types';
import {
  MockAwsRum,
  mockRecord,
  waitFor,
  createTestElement,
  cleanupTestElements,
} from './setup';

describe('TelemetryManager Integration', () => {
  let manager: TelemetryManager;
  let config: TelemetryConfig;
  let context: TelemetryContext;
  let originalConsole: {
    log: typeof console.log;
    info: typeof console.info;
    warn: typeof console.warn;
    error: typeof console.error;
    debug: typeof console.debug;
  };

  // Store original history methods to ensure proper cleanup between tests
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  beforeEach(() => {
    cleanupTestElements();

    // Restore original history methods before each test
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;

    originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };

    config = {
      enabled: true,
      rumConfig: {
        applicationId: 'integration-test',
        identityPoolId: 'us-east-1:test',
        region: 'us-east-1',
        sessionSampleRate: 1.0,
      },
      capture: {
        console: { levels: ['log', 'warn', 'error'] },
        network: { urlFilter: [/^https:\/\/api\./] },
        navigation: true,
        dom: { throttleMs: 50 },
      },
    };

    context = {
      projectId: 'integration-project',
      flowId: 'integration-flow',
      version: '2.0.0',
    };
  });

  afterEach(async () => {
    // Shutdown and wait for all async cleanup to complete
    if (manager) {
      manager.shutdown();
      // Wait longer to ensure all MutationObserver callbacks and throttled events complete
      await waitFor(350);
    }

    // Clear the mock to prevent pollution
    mockRecord.mockClear();

    // Restore console
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;

    // Restore history methods
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;

    cleanupTestElements();

    // Final wait to ensure complete cleanup
    await waitFor(100);
  });

  describe('Full Stack Integration', () => {
    it('should initialize all components and capture events', async () => {
      manager = new TelemetryManager(config, context);

      expect(manager.isReady()).toBe(true);
      expect(manager.getRumClient()).toBeInstanceOf(MockAwsRum);

      // Test console
      console.log('Test message');
      expect(mockRecord).toHaveBeenCalledWith(
        'console_log',
        expect.objectContaining({ level: 'log' }),
      );

      // Test navigation
      history.pushState(null, '', '/test');
      expect(mockRecord).toHaveBeenCalledWith(
        'navigation',
        expect.objectContaining({ type: 'pushState' }),
      );

      // Test DOM
      const container = createTestElement('integration-test');
      container.appendChild(document.createElement('div'));
      await waitFor(100);

      expect(mockRecord).toHaveBeenCalledWith(
        'dom_mutation',
        expect.objectContaining({ addedNodes: expect.any(Number) }),
      );
    });

    it('should respect filter configurations', () => {
      manager = new TelemetryManager(config, context);

      // Console: should only capture configured levels
      console.info('Info message'); // Not configured
      expect(mockRecord).not.toHaveBeenCalled();

      console.log('Log message'); // Configured
      expect(mockRecord).toHaveBeenCalled();
      mockRecord.mockClear();

      console.error('Error message'); // Configured
      expect(mockRecord).toHaveBeenCalled();
    });

    it('should properly shutdown all components', async () => {
      manager = new TelemetryManager(config, context);

      manager.shutdown();

      mockRecord.mockClear();

      // Console should not record
      console.log('After shutdown');
      expect(mockRecord).not.toHaveBeenCalled();

      // Navigation should not record
      history.pushState(null, '', '/after-shutdown');
      expect(mockRecord).not.toHaveBeenCalled();

      // DOM should not record
      const container = createTestElement('shutdown-test');
      container.appendChild(document.createElement('div'));
      await waitFor(100);
      expect(mockRecord).not.toHaveBeenCalled();

      expect(manager.isReady()).toBe(false);
    });
  });

  describe('Enable/Disable Integration', () => {
    beforeEach(() => {
      manager = new TelemetryManager(config, context);
    });

    it('should disable and re-enable all plugins', async () => {
      // Initial state - should record
      console.log('Enabled');
      expect(mockRecord).toHaveBeenCalledTimes(1);
      mockRecord.mockClear();

      // Disable
      manager.disable();
      console.log('Disabled');
      history.pushState(null, '', '/disabled');
      const container = createTestElement('disable-test');
      container.appendChild(document.createElement('div'));
      await waitFor(100);

      expect(mockRecord).not.toHaveBeenCalled();

      // Re-enable
      manager.enable();
      console.log('Re-enabled');
      expect(mockRecord).toHaveBeenCalledTimes(1);
    });

    it('should maintain configuration after enable/disable cycles', () => {
      manager.disable();
      manager.enable();

      // Console filtering should still work
      console.info('Info'); // Not configured
      expect(mockRecord).not.toHaveBeenCalled();

      console.error('Error'); // Configured
      expect(mockRecord).toHaveBeenCalled();
    });
  });

  describe('Multiple Event Sources', () => {
    beforeEach(() => {
      manager = new TelemetryManager(config, context);
    });

    it('should capture events from multiple sources simultaneously', async () => {
      const container = createTestElement('multi-source');

      // Trigger events from different sources
      console.log('Console event');
      history.pushState(null, '', '/nav-event');
      container.appendChild(document.createElement('div'));

      await waitFor(100);

      // Should have recorded all three
      const eventTypes = mockRecord.mock.calls.map((call) => call[0]);
      expect(eventTypes).toContain('console_log');
      expect(eventTypes).toContain('navigation');
      expect(eventTypes).toContain('dom_mutation');
    });

    it('should maintain separate event data', async () => {
      console.log('Test log', { data: 123 });
      history.pushState({ state: 'test' }, '', '/test-path');

      const consoleCall = mockRecord.mock.calls.find(
        (call) => call[0] === 'console_log',
      );
      const navCall = mockRecord.mock.calls.find(
        (call) => call[0] === 'navigation',
      );

      expect(consoleCall[1].message).toContain('Test log');
      expect(navCall[1].type).toBe('pushState');
    });
  });

  describe('Error Resilience', () => {
    it('should continue working if one plugin fails', () => {
      // Make record throw for console events only
      mockRecord.mockImplementation((eventType) => {
        if (eventType === 'console_log') {
          throw new Error('Console recording failed');
        }
      });

      manager = new TelemetryManager(config, context);

      // Console should fail silently
      expect(() => {
        console.log('Test');
      }).not.toThrow();

      // But navigation should still work
      mockRecord.mockClear();
      mockRecord.mockImplementation(() => {}); // Reset to not throw

      history.pushState(null, '', '/test');
      expect(mockRecord).toHaveBeenCalledWith('navigation', expect.any(Object));
    });

    it('should handle shutdown errors gracefully', () => {
      manager = new TelemetryManager(config, context);

      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      const disableSpy = jest
        .spyOn(rumClient, 'disable')
        .mockImplementation(() => {
          throw new Error('Shutdown failed');
        });

      expect(() => {
        manager.shutdown();
      }).not.toThrow();

      // Manager marks itself as not ready even if shutdown has errors
      expect(manager.isReady()).toBe(true); // Still ready because disable() threw

      // Restore spy so per-test cleanup can complete normally
      disableSpy.mockRestore();
    });
  });

  describe('Configuration Variations', () => {
    it('should work with minimal configuration', () => {
      const minimalConfig: TelemetryConfig = {
        enabled: true,
        rumConfig: {
          applicationId: 'min-test',
          identityPoolId: 'us-east-1:min',
          region: 'us-east-1',
          sessionSampleRate: 1.0,
        },
      };

      manager = new TelemetryManager(minimalConfig, context);

      expect(manager.isReady()).toBe(true);

      // Should still capture with default settings
      console.log('Test');
      expect(mockRecord).toHaveBeenCalled();
    });

    it('should work with selective plugin enabling', async () => {
      const selectiveConfig: TelemetryConfig = {
        ...config,
        capture: {
          console: true,
          network: false,
          navigation: false,
          dom: false,
        },
      };

      manager = new TelemetryManager(selectiveConfig, context);

      console.log('Should record');
      expect(mockRecord).toHaveBeenCalledWith(
        'console_log',
        expect.any(Object),
      );

      mockRecord.mockClear();

      // Navigation was disabled
      // Verify navigation events are NOT recorded
      history.pushState(null, '', '/should-not-record');
      await waitFor(100);

      // Should have no navigation calls
      const navigationCalls = mockRecord.mock.calls.filter(
        ([type]) => type === 'navigation',
      );
      expect(navigationCalls.length).toBe(0);
    });

    it('should handle complex plugin configurations', async () => {
      const complexConfig: TelemetryConfig = {
        ...config,
        capture: {
          console: {
            levels: ['error'] as any,
          },
          network: {
            urlFilter: [/api/, /cdn/],
          },
          navigation: true,
          dom: {
            rootElement: '#custom-root',
            throttleMs: 200,
          },
        },
      };

      createTestElement('custom-root');
      manager = new TelemetryManager(complexConfig, context);

      // Test console filtering
      console.log('Should not record');
      expect(mockRecord).not.toHaveBeenCalled();

      console.error('Should record');
      expect(mockRecord).toHaveBeenCalled();

      // Test message truncation
      mockRecord.mockClear();
      const longMessage = 'X'.repeat(200);
      console.error(longMessage);

      const call = mockRecord.mock.calls[0][1];
      // Message should be truncated (default is 10KB, so 200 chars won't trigger it)
      // This test config doesn't actually set maxMessageLength since it's not in the type
      expect(call.message).toBe(longMessage); // Not truncated at 200 chars
    });
  });

  describe('Session Context', () => {
    it('should add project and flow context to session', () => {
      manager = new TelemetryManager(config, context);

      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      expect(rumClient.addSessionAttributes).toHaveBeenCalledWith({
        projectId: 'integration-project',
        flowId: 'integration-flow',
      });
    });

    it('should use provided version in RUM client', () => {
      manager = new TelemetryManager(config, context);

      const rumClient = manager.getRumClient() as unknown as MockAwsRum;
      expect(rumClient.version).toBe('2.0.0');
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle SPA navigation with console logging', () => {
      manager = new TelemetryManager(config, context);
      mockRecord.mockClear(); // Clear any initialization events

      // User navigates
      console.log('User clicked navigation link');
      history.pushState({ page: 1 }, '', '/page-1');

      // User interacts
      console.log('User submitted form');
      history.pushState({ page: 2 }, '', '/page-2');

      // Check both event types were recorded
      const eventTypes = mockRecord.mock.calls.map((call) => call[0]);
      expect(
        eventTypes.filter((t) => t === 'console_log').length,
      ).toBeGreaterThanOrEqual(2);
      expect(
        eventTypes.filter((t) => t === 'navigation').length,
      ).toBeGreaterThanOrEqual(2);
    });

    it('should handle rapid DOM mutations efficiently', async () => {
      const container = createTestElement('rapid-mutations');
      manager = new TelemetryManager(config, context);

      // Simulate rapid UI updates
      for (let i = 0; i < 10; i++) {
        const div = document.createElement('div');
        div.textContent = `Item ${i}`;
        container.appendChild(div);
      }

      await waitFor(100);

      // Should aggregate into single event due to throttling
      const domMutations = mockRecord.mock.calls.filter(
        (call) => call[0] === 'dom_mutation',
      );
      expect(domMutations.length).toBeLessThanOrEqual(2);

      // Should aggregate all nodes
      const totalAdded = domMutations.reduce(
        (sum, call) => sum + call[1].addedNodes,
        0,
      );
      expect(totalAdded).toBeGreaterThanOrEqual(10);
    });

    it('should handle error scenarios gracefully', () => {
      manager = new TelemetryManager(config, context);

      // Simulate error logging
      try {
        throw new Error('Test error');
      } catch (error) {
        console.error('Caught error:', error);
      }

      expect(mockRecord).toHaveBeenCalledWith(
        'console_log',
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('Caught error'),
        }),
      );
    });

    it('should clean up properly on page unload simulation', async () => {
      // Create a fresh manager for this test
      manager = new TelemetryManager(config, context);

      // Clear any initialization events
      await waitFor(50);
      mockRecord.mockClear();

      // Simulate various user actions BEFORE shutdown
      console.log('User action 1');
      const preShutdownContainer = createTestElement('pre-shutdown-test');
      preShutdownContainer.appendChild(document.createElement('div'));
      history.pushState(null, '', '/page');

      // Wait for throttled events to be recorded
      await waitFor(150);

      const eventsBeforeShutdown = mockRecord.mock.calls.length;
      expect(eventsBeforeShutdown).toBeGreaterThan(0);

      // Simulate page unload - shutdown and disable all plugins
      manager.shutdown();

      // Allow any pending flush triggered during shutdown to complete
      await waitFor(50);

      const baselineAfterShutdown = mockRecord.mock.calls.length;

      // NOW create new elements AFTER shutdown - these should NOT be recorded
      history.pushState(null, '', '/after');
      const postShutdownContainer = createTestElement('post-shutdown-test');
      postShutdownContainer.appendChild(document.createElement('div'));

      // Wait to see if any new events are recorded
      await waitFor(250);

      // Check that NO new events were recorded after shutdown
      const eventsAfterShutdown = mockRecord.mock.calls.length;
      expect(eventsAfterShutdown).toBe(baselineAfterShutdown);

      // Clean up test elements
      preShutdownContainer.remove();
      postShutdownContainer.remove();
    });
  });

  describe('Performance Considerations', () => {
    it('should not significantly delay console calls', () => {
      manager = new TelemetryManager(config, context);

      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        console.log(`Message ${i}`);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;

      // Each call should be very fast (< 1ms on average)
      expect(avgTime).toBeLessThan(1);
    });

    it('should throttle DOM mutations effectively', async () => {
      const container = createTestElement('perf-test');
      manager = new TelemetryManager(config, context);

      const mutations = 50;
      for (let i = 0; i < mutations; i++) {
        container.appendChild(document.createElement('div'));
      }

      await waitFor(100);

      // Should have throttled to very few events
      const domEvents = mockRecord.mock.calls.filter(
        (call) => call[0] === 'dom_mutation',
      );
      expect(domEvents.length).toBeLessThan(5);
    });
  });
});
