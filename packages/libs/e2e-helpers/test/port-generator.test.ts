import { generatePorts, getWidgetTestPorts } from '../src/port-generator';

describe('generatePorts', () => {
  it('should have default 5 ports', () => {
    const ports = generatePorts();
    expect(ports.length).toBe(5);
  });

  it('should generate n ports', () => {
    [1, 10, 100].forEach((n) => {
      expect(generatePorts({ count: n }).length).toBe(n);
    });
  });

  it(`should generate ports within range`, () => {
    const ports = generatePorts({ start: 5000, end: 6000 });
    ports.forEach((port) => {
      expect(port).toBeGreaterThanOrEqual(5000);
      expect(port).toBeLessThanOrEqual(6000);
    });
  });

  it('should generate integer ports', () => {
    const [port] = generatePorts();
    expect(Number.isInteger(port)).toBe(true);
  });
});

it('should throw error for invalid input', () => {
  expect(() => generatePorts({ count: null as any })).toThrow(
    'Port Generator: Count must be a positive integer',
  );

  expect(() => generatePorts({ count: 0 })).toThrow(
    'Port Generator: Count must be a positive integer',
  );

  expect(() => generatePorts({ count: -1 })).toThrow(
    'Port Generator: Count must be a positive integer',
  );

  expect(() => generatePorts({ start: 5000, end: 4000 })).toThrow(
    'Port Generator: Start port (5000) must be less than end port (4000)',
  );
});

describe('getWidgetTestPorts', () => {
  beforeEach(() => {
    delete process.env.PLAYWRIGHT_COMPONENTS_PORT;
    delete process.env.PLAYWRIGHT_WIDGET_PORT;
  });

  afterEach(() => {
    delete process.env.PLAYWRIGHT_COMPONENTS_PORT;
    delete process.env.PLAYWRIGHT_WIDGET_PORT;
  });

  it('should return 2 ports by default', () => {
    const ports = getWidgetTestPorts();
    expect(ports).toHaveLength(2);
    expect(ports.every(Number.isInteger)).toBe(true);
  });

  it('should cache ports in environment variables', () => {
    const firstCall = getWidgetTestPorts();
    const secondCall = getWidgetTestPorts();

    expect(firstCall).toEqual(secondCall);
    expect(process.env.PLAYWRIGHT_COMPONENTS_PORT).toBe(
      firstCall[0].toString(),
    );
    expect(process.env.PLAYWRIGHT_WIDGET_PORT).toBe(firstCall[1].toString());
  });

  it('should reuse existing env vars if set', () => {
    process.env.PLAYWRIGHT_COMPONENTS_PORT = '1234';
    process.env.PLAYWRIGHT_WIDGET_PORT = '5678';

    const ports = getWidgetTestPorts();
    expect(ports).toEqual([1234, 5678]);
  });

  it('should respect custom options', () => {
    const ports = getWidgetTestPorts({ count: 2, start: 9000, end: 9100 });

    expect(ports).toHaveLength(2);
    ports.forEach((port) => {
      expect(port).toBeGreaterThanOrEqual(9000);
      expect(port).toBeLessThanOrEqual(9100);
    });
  });
});
