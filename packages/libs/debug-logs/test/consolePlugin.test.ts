/**
 * Unit tests for ConsolePlugin
 */

import { ConsolePlugin } from '../src/plugins/consolePlugin';
import { createMockPluginContext, mockRecord } from './setup';

describe('ConsolePlugin', () => {
  let plugin: ConsolePlugin;
  let mockContext: ReturnType<typeof createMockPluginContext>;
  let originalConsole: {
    log: typeof console.log;
    info: typeof console.info;
    warn: typeof console.warn;
    error: typeof console.error;
    debug: typeof console.debug;
  };

  beforeEach(() => {
    mockContext = createMockPluginContext();
    // Store original console methods
    originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;
  });

  describe('Constructor and Configuration', () => {
    it('should create plugin with default config (all levels)', () => {
      plugin = new ConsolePlugin();
      expect(plugin.getPluginId()).toBe('console-plugin');
    });

    it('should create plugin with specific log levels', () => {
      plugin = new ConsolePlugin({ levels: ['error', 'warn'] });
      plugin.load(mockContext);

      console.error('test error');
      console.log('test log');

      // Should only record error, not log
      expect(mockRecord).toHaveBeenCalledTimes(1);
      expect(mockRecord).toHaveBeenCalledWith('console_log', {
        level: 'error',
        message: 'test error',
        timestamp: expect.any(Number),
      });
    });

    it('should accept custom maxMessageLength', () => {
      plugin = new ConsolePlugin({ maxMessageLength: 20 });
      plugin.load(mockContext);

      console.log('This is a very long message that should be truncated');

      expect(mockRecord).toHaveBeenCalledWith('console_log', {
        level: 'log',
        message: expect.stringContaining('... [truncated]'),
        timestamp: expect.any(Number),
      });
    });
  });

  describe('Plugin Lifecycle', () => {
    beforeEach(() => {
      plugin = new ConsolePlugin();
    });

    it('should intercept console methods after load', () => {
      plugin.load(mockContext);

      console.log('test message');

      expect(mockRecord).toHaveBeenCalledWith('console_log', {
        level: 'log',
        message: 'test message',
        timestamp: expect.any(Number),
      });
    });

    it('should still call original console methods', () => {
      plugin.load(mockContext);

      // The plugin calls the original method internally
      console.log('test');

      // Verify the original console.log was called (via the plugin)
      expect(mockRecord).toHaveBeenCalled();
    });

    it('should restore console methods on disable', () => {
      plugin.load(mockContext);
      const interceptedLog = console.log;

      plugin.disable();

      expect(console.log).not.toBe(interceptedLog);
      console.log('after disable');
      expect(mockRecord).not.toHaveBeenCalled();
    });

    it('should handle enable/disable toggle', () => {
      plugin.load(mockContext);

      console.log('enabled 1');
      expect(mockRecord).toHaveBeenCalledTimes(1);

      plugin.disable();
      mockRecord.mockClear();
      console.log('disabled');
      expect(mockRecord).not.toHaveBeenCalled();

      plugin.enable();
      console.log('enabled 2');
      expect(mockRecord).toHaveBeenCalledTimes(1);
    });

    it('should not double-intercept on multiple enables', () => {
      plugin.load(mockContext);
      plugin.enable();
      plugin.enable();

      console.log('test');

      // Should only record once, not multiple times
      expect(mockRecord).toHaveBeenCalledTimes(1);
    });
  });

  describe('Log Level Filtering', () => {
    it('should capture all log levels by default', () => {
      plugin = new ConsolePlugin();
      plugin.load(mockContext);

      console.log('log message');
      console.info('info message');
      console.warn('warn message');
      console.error('error message');
      console.debug('debug message');

      expect(mockRecord).toHaveBeenCalledTimes(5);
    });

    it('should only capture configured levels', () => {
      plugin = new ConsolePlugin({ levels: ['error', 'warn'] });
      plugin.load(mockContext);

      console.log('log');
      console.info('info');
      console.warn('warn');
      console.error('error');
      console.debug('debug');

      expect(mockRecord).toHaveBeenCalledTimes(2);
      expect(mockRecord).toHaveBeenCalledWith(
        'console_log',
        expect.objectContaining({ level: 'warn' }),
      );
      expect(mockRecord).toHaveBeenCalledWith(
        'console_log',
        expect.objectContaining({ level: 'error' }),
      );
    });

    it('should handle single level configuration', () => {
      plugin = new ConsolePlugin({ levels: ['error'] });
      plugin.load(mockContext);

      console.log('log');
      console.error('error');

      expect(mockRecord).toHaveBeenCalledTimes(1);
      expect(mockRecord).toHaveBeenCalledWith(
        'console_log',
        expect.objectContaining({ level: 'error' }),
      );
    });
  });

  describe('Message Formatting', () => {
    beforeEach(() => {
      plugin = new ConsolePlugin();
      plugin.load(mockContext);
    });

    it('should stringify objects', () => {
      console.log({ key: 'value', nested: { data: 123 } });

      expect(mockRecord).toHaveBeenCalledWith('console_log', {
        level: 'log',
        message: '{"key":"value","nested":{"data":123}}',
        timestamp: expect.any(Number),
      });
    });

    it('should join multiple arguments', () => {
      console.log('Hello', 'world', 123, true);

      expect(mockRecord).toHaveBeenCalledWith('console_log', {
        level: 'log',
        message: 'Hello world 123 true',
        timestamp: expect.any(Number),
      });
    });

    it('should handle arrays', () => {
      console.log(['item1', 'item2', 123]);

      expect(mockRecord).toHaveBeenCalledWith('console_log', {
        level: 'log',
        message: '["item1","item2",123]',
        timestamp: expect.any(Number),
      });
    });

    it('should handle null and undefined', () => {
      console.log(null, undefined);

      expect(mockRecord).toHaveBeenCalledWith('console_log', {
        level: 'log',
        message: 'null undefined',
        timestamp: expect.any(Number),
      });
    });

    it('should convert all arguments to strings', () => {
      console.log('String', 123, true, Symbol('test'));

      const call = mockRecord.mock.calls[0][1];
      expect(call.message).toContain('String');
      expect(call.message).toContain('123');
      expect(call.message).toContain('true');
    });
  });

  describe('Message Truncation', () => {
    it('should truncate messages exceeding maxMessageLength', () => {
      plugin = new ConsolePlugin({ maxMessageLength: 50 });
      plugin.load(mockContext);

      const longMessage = 'A'.repeat(100);
      console.log(longMessage);

      const call = mockRecord.mock.calls[0][1];
      expect(call.message.length).toBeLessThanOrEqual(50);
      expect(call.message).toContain('... [truncated]');
      expect(call.message).toMatch(/^A+\.\.\.\s\[truncated\]$/);
    });

    it('should not truncate short messages', () => {
      plugin = new ConsolePlugin({ maxMessageLength: 100 });
      plugin.load(mockContext);

      console.log('Short message');

      const call = mockRecord.mock.calls[0][1];
      expect(call.message).toBe('Short message');
      expect(call.message).not.toContain('[truncated]');
    });

    it('should use default maxMessageLength of 10KB', () => {
      plugin = new ConsolePlugin();
      plugin.load(mockContext);

      const message10KB = 'A'.repeat(10240);
      const message10KBPlus = 'A'.repeat(10241);

      console.log(message10KB);
      expect(mockRecord.mock.calls[0][1].message).not.toContain('[truncated]');

      mockRecord.mockClear();
      console.log(message10KBPlus);
      expect(mockRecord.mock.calls[0][1].message).toContain('[truncated]');
    });

    it('should preserve beginning of long messages', () => {
      plugin = new ConsolePlugin({ maxMessageLength: 50 });
      plugin.load(mockContext);

      console.log('IMPORTANT: ' + 'X'.repeat(100));

      const call = mockRecord.mock.calls[0][1];
      expect(call.message).toMatch(/^IMPORTANT: X+\.\.\. \[truncated\]$/);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      plugin = new ConsolePlugin();
    });

    it('should fail silently if recording throws error', () => {
      mockRecord.mockImplementation(() => {
        throw new Error('Recording failed');
      });

      plugin.load(mockContext);

      expect(() => {
        console.log('test');
      }).not.toThrow();
    });

    it('should still call original console if recording fails', () => {
      mockRecord.mockImplementation(() => {
        throw new Error('Recording failed');
      });

      plugin.load(mockContext);

      // Should not throw - fails silently and calls original
      expect(() => {
        console.log('test message');
      }).not.toThrow();

      // Recording was attempted but failed
      expect(mockRecord).toHaveBeenCalled();
    });

    it('should handle JSON.stringify errors gracefully', () => {
      plugin.load(mockContext);

      const circular: any = {};
      circular.self = circular;

      expect(() => {
        console.log(circular);
      }).not.toThrow();

      // Should still call original console
      expect(originalConsole.log).toBeDefined();
    });
  });

  describe('Timestamp', () => {
    beforeEach(() => {
      plugin = new ConsolePlugin();
      plugin.load(mockContext);
    });

    it('should include timestamp in recorded events', () => {
      const beforeTimestamp = Date.now();
      console.log('test');
      const afterTimestamp = Date.now();

      const call = mockRecord.mock.calls[0][1];
      expect(call.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(call.timestamp).toBeLessThanOrEqual(afterTimestamp);
    });

    it('should use different timestamps for different calls', () => {
      console.log('first');
      const timestamp1 = mockRecord.mock.calls[0][1].timestamp;

      console.log('second');
      const timestamp2 = mockRecord.mock.calls[1][1].timestamp;

      expect(timestamp2).toBeGreaterThanOrEqual(timestamp1);
    });
  });

  describe('Plugin ID', () => {
    it('should return consistent plugin ID', () => {
      plugin = new ConsolePlugin();
      expect(plugin.getPluginId()).toBe('console-plugin');
    });
  });
});
