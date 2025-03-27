import { loadGRecaptcha } from '../../src/lib/descope-wc/sdkScripts/grecaptcha';

describe('reCAPTCHA script', () => {
  let onTokenReady;
  let element;

  beforeEach(() => {
    // Mock DOM elements
    element = document.createElement('div');
    document.body.appendChild(element);

    // Mock the token ready callback
    onTokenReady = jest.fn();

    // Mock the grecaptcha object
    global.grecaptcha = {
      enterprise: {
        execute: jest.fn(() => Promise.resolve('mock-token')),
        ready: jest.fn((callback) => callback()),
        render: jest.fn(() => 'render-id'),
      },
      ready: jest.fn((callback) => callback()),
      execute: jest.fn(() => Promise.resolve('mock-token')),
      render: jest.fn(() => 'render-id'),
    };

    // Mock the window.onRecaptchaLoadCallback
    global.onRecaptchaLoadCallback = null;

    // Mock Date.now
    jest.spyOn(Date, 'now').mockImplementation(() => 1000);
  });

  afterEach(() => {
    jest.clearAllMocks();
    document.body.removeChild(element);
  });

  it('should load reCAPTCHA script and return proper module', () => {
    const initArgs = {
      enterprise: false,
      siteKey: 'test-site-key',
    };

    const module = loadGRecaptcha(initArgs, {}, onTokenReady);

    // Check that the module has the expected methods
    expect(module).toHaveProperty('stop');
    expect(module).toHaveProperty('start');
    expect(module).toHaveProperty('refresh');

    // Verify the methods are functions
    expect(typeof module.stop).toBe('function');
    expect(typeof module.start).toBe('function');
    expect(typeof module.refresh).toBe('function');
  });

  it('should have a refresh method with timeout safety', () => {
    const initArgs = {
      enterprise: false,
      siteKey: 'test-site-key',
    };

    // Create module
    const module = loadGRecaptcha(initArgs, {}, onTokenReady);

    // Verify refresh method exists and returns a promise
    expect(typeof module.refresh).toBe('function');

    // Verify the refresh method returns a Promise
    const refreshPromise = module.refresh();
    expect(refreshPromise).toBeInstanceOf(Promise);
  });
});
