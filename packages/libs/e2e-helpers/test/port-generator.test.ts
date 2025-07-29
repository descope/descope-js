import { generatePortFromName } from '../src/port-generator';

const PORT_MIN = 3000;
const PORT_MAX = 65000;

describe('generatePortFromName', () => {
  describe('valid inputs', () => {
    it('should generate consistent ports for the same name', () => {
      const name = 'test-service';
      const port1 = generatePortFromName(name);
      const port2 = generatePortFromName(name);

      expect(port1).toBe(port2);
    });

    it('should generate different ports for different names', () => {
      const port1 = generatePortFromName('service-1');
      const port2 = generatePortFromName('service-2');

      expect(port1).not.toBe(port2);
    });

    it(`should generate ports within the expected range (${PORT_MIN}-${PORT_MAX})`, () => {
      const testNames = [
        'test-service',
        'another-service',
        'very-long-service-name-with-many-characters',
        'short',
        'service-with-numbers-123',
        'service-with-special-chars-!@#',
      ];

      testNames.forEach((name) => {
        const port = generatePortFromName(name);
        expect(port).toBeGreaterThanOrEqual(PORT_MIN);
        expect(port).toBeLessThanOrEqual(PORT_MAX);
      });
    });

    it('should generate integer ports', () => {
      const port = generatePortFromName('test-service');
      expect(Number.isInteger(port)).toBe(true);
    });

    it('should handle names with various characters', () => {
      const specialNames = [
        'service-with-dashes',
        'service_with_underscores',
        'ServiceWithCamelCase',
        'service.with.dots',
        'service123with456numbers',
        'service with spaces',
      ];

      specialNames.forEach((name) => {
        expect(() => generatePortFromName(name)).not.toThrow();
        const port = generatePortFromName(name);
        expect(port).toBeGreaterThanOrEqual(PORT_MIN);
        expect(port).toBeLessThanOrEqual(PORT_MAX);
      });
    });
  });

  describe('invalid inputs', () => {
    it('should throw error for empty string', () => {
      expect(() => generatePortFromName('')).toThrow(
        'port generator: name must be specified!',
      );
    });

    it('should throw error for whitespace-only string', () => {
      expect(() => generatePortFromName('   ')).toThrow(
        'port generator: name must be specified!',
      );
    });

    it('should throw error for null input', () => {
      expect(() => generatePortFromName(null as any)).toThrow(
        'port generator: name must be specified!',
      );
    });

    it('should throw error for undefined input', () => {
      expect(() => generatePortFromName(undefined as any)).toThrow(
        'port generator: name must be specified!',
      );
    });

    it('should throw error for non-string input', () => {
      expect(() => generatePortFromName(123 as any)).toThrow(
        'port generator: name must be specified!',
      );
      expect(() => generatePortFromName({} as any)).toThrow(
        'port generator: name must be specified!',
      );
      expect(() => generatePortFromName([] as any)).toThrow(
        'port generator: name must be specified!',
      );
    });
  });

  describe('real-world examples', () => {
    it('should generate expected ports for actual service names', () => {
      // Test with actual service names from the codebase
      const actualServices = [
        'outbound-applications-portal-service',
        'outbound-applications-portal-service-components',
        'user-management-service',
        'access-key-management-service',
      ];

      const ports = actualServices.map((name) => generatePortFromName(name));

      // All ports should be unique
      const uniquePorts = new Set(ports);
      expect(uniquePorts.size).toBe(ports.length);

      // All ports should be in valid range
      ports.forEach((port) => {
        expect(port).toBeGreaterThanOrEqual(PORT_MIN);
        expect(port).toBeLessThanOrEqual(PORT_MAX);
      });
    });
  });
});
