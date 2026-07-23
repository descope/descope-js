/**
 * Test setup and utilities
 */

// Mock AWS RUM Web
export const mockRecord = jest.fn();
export const mockAddSessionAttributes = jest.fn();
export const mockDisable = jest.fn();

export const mockAwsRum = {
  addSessionAttributes: mockAddSessionAttributes,
  disable: mockDisable,
};

export class MockAwsRum {
  public config: any;

  constructor(
    public appId: string,
    public version: string,
    public region: string,
    config: any,
  ) {
    // Validate required parameters like the real AwsRum would
    if (!region) {
      throw new Error('Region is required');
    }

    this.config = config;
    Object.assign(this, mockAwsRum);

    // Load plugins if provided
    if (config.eventPluginsToLoad) {
      const pluginContext = {
        applicationId: appId,
        applicationVersion: version,
        config: {},
        record: mockRecord,
        recordPageView: jest.fn(),
        getSession: jest.fn(() => ({ sessionId: 'test-session' })),
        eventBus: {
          dispatch: jest.fn(),
          listen: jest.fn(),
        },
      };

      config.eventPluginsToLoad.forEach((plugin: any) => {
        if (plugin && typeof plugin.load === 'function') {
          plugin.load(pluginContext);
        }
      });
    }
  }

  addSessionAttributes = mockAddSessionAttributes;
  disable = mockDisable;
}

// Mock aws-rum-web module
jest.mock('aws-rum-web', () => ({
  AwsRum: MockAwsRum,
}));

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockRecord.mockClear();
  mockAddSessionAttributes.mockClear();
  mockDisable.mockClear();
});

// Helper to create mock PluginContext
export function createMockPluginContext(): any {
  return {
    applicationId: 'test-app-id',
    applicationVersion: '1.0.0',
    config: {} as any,
    record: mockRecord,
    recordPageView: jest.fn(),
    getSession: jest.fn(() => ({ sessionId: 'test-session' })),
    eventBus: {
      dispatch: jest.fn(),
      listen: jest.fn(),
    },
  };
}

// Helper to wait for async operations
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper to create a DOM element for testing
export function createTestElement(id: string, innerHTML = ''): HTMLElement {
  const element = document.createElement('div');
  element.id = id;
  element.innerHTML = innerHTML;
  document.body.appendChild(element);
  return element;
}

// Cleanup helper
export function cleanupTestElements(): void {
  document.body.innerHTML = '';
}
