import { generatePortFromWidgetName } from './port-generator';

describe('generatePortFromWidgetName', () => {
  describe('valid inputs', () => {
    it('should generate consistent ports for the same widget name', () => {
      const widgetName = 'test-widget';
      const port1 = generatePortFromWidgetName(widgetName);
      const port2 = generatePortFromWidgetName(widgetName);

      expect(port1).toBe(port2);
    });

    it('should generate different ports for different widget names', () => {
      const port1 = generatePortFromWidgetName('widget-1');
      const port2 = generatePortFromWidgetName('widget-2');

      expect(port1).not.toBe(port2);
    });

    it('should generate ports within the expected range (3000-9999)', () => {
      const testNames = [
        'test-widget',
        'another-widget',
        'very-long-widget-name-with-many-characters',
        'short',
        'widget-with-numbers-123',
        'widget-with-special-chars-!@#',
      ];

      testNames.forEach((name) => {
        const port = generatePortFromWidgetName(name);
        expect(port).toBeGreaterThanOrEqual(3000);
        expect(port).toBeLessThanOrEqual(9999);
      });
    });

    it('should generate integer ports', () => {
      const port = generatePortFromWidgetName('test-widget');
      expect(Number.isInteger(port)).toBe(true);
    });

    it('should handle widget names with various characters', () => {
      const specialNames = [
        'widget-with-dashes',
        'widget_with_underscores',
        'WidgetWithCamelCase',
        'widget.with.dots',
        'widget123with456numbers',
        'widget with spaces',
      ];

      specialNames.forEach((name) => {
        expect(() => generatePortFromWidgetName(name)).not.toThrow();
        const port = generatePortFromWidgetName(name);
        expect(port).toBeGreaterThanOrEqual(3000);
        expect(port).toBeLessThanOrEqual(9999);
      });
    });
  });

  describe('invalid inputs', () => {
    it('should throw error for empty string', () => {
      expect(() => generatePortFromWidgetName('')).toThrow(
        'Widget name must be a non-empty string',
      );
    });

    it('should throw error for whitespace-only string', () => {
      expect(() => generatePortFromWidgetName('   ')).toThrow(
        'Widget name must be a non-empty string',
      );
    });

    it('should throw error for null input', () => {
      expect(() => generatePortFromWidgetName(null as any)).toThrow(
        'Widget name must be a non-empty string',
      );
    });

    it('should throw error for undefined input', () => {
      expect(() => generatePortFromWidgetName(undefined as any)).toThrow(
        'Widget name must be a non-empty string',
      );
    });

    it('should throw error for non-string input', () => {
      expect(() => generatePortFromWidgetName(123 as any)).toThrow(
        'Widget name must be a non-empty string',
      );
      expect(() => generatePortFromWidgetName({} as any)).toThrow(
        'Widget name must be a non-empty string',
      );
      expect(() => generatePortFromWidgetName([] as any)).toThrow(
        'Widget name must be a non-empty string',
      );
    });
  });

  describe('real-world examples', () => {
    it('should generate expected ports for actual widget names', () => {
      // Test with actual widget names from the codebase
      const actualWidgets = [
        'outbound-applications-portal-widget',
        'outbound-applications-portal-widget-components',
        'user-management-widget',
        'access-key-management-widget',
      ];

      const ports = actualWidgets.map((name) =>
        generatePortFromWidgetName(name),
      );

      // All ports should be unique
      const uniquePorts = new Set(ports);
      expect(uniquePorts.size).toBe(ports.length);

      // All ports should be in valid range
      ports.forEach((port) => {
        expect(port).toBeGreaterThanOrEqual(3000);
        expect(port).toBeLessThanOrEqual(9999);
      });
    });
  });
});
