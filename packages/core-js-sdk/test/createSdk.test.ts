import createSdk from '../src/index';

const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

describe('createSdk', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call "beforeRequest" that set on init', async () => {
    mockFetch.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        json: () => ({ data: 'data' }),
        text: () => '{"data": "data"}',
        headers: new Headers({ h: '1' }),
      }),
    );

    const beforeRequestHook = jest.fn().mockImplementation((config) => config);

    // add hook on init
    const sdk = createSdk({
      projectId: '123',
      hooks: {
        beforeRequest: beforeRequestHook,
      },
    });

    // ensure hook called
    await sdk.otp.signIn.email('1@1.com');
    expect(beforeRequestHook).toHaveBeenCalled();
  });

  it('should call "beforeRequest" that set after init', async () => {
    mockFetch.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        json: () => ({ data: 'data' }),
        text: () => '{"data": "data"}',
        headers: new Headers({ h: '1' }),
      }),
    );

    const beforeRequestHook = jest.fn().mockImplementation((conf) => conf);

    const config = {
      projectId: '123',
    } as Parameters<typeof createSdk>[0];

    const sdk = createSdk(config);

    // add hook after init
    config.hooks = {
      beforeRequest: beforeRequestHook,
    };

    // ensure hook called
    await sdk.otp.signIn.email('1@1.com');
    expect(beforeRequestHook).toHaveBeenCalled();
  });

  it('should call "afterRequest"', async () => {
    mockFetch.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        json: () => ({ data: 'data' }),
        text: () => '{"data": "data"}',
        headers: new Headers({ h: '1' }),
      }),
    );

    const afterRequestHook = jest.fn();

    const sdk = createSdk({
      projectId: '123',
      hooks: {
        afterRequest: afterRequestHook,
      },
    });

    await sdk.otp.signIn.email('1@1.com');
    expect(afterRequestHook).toHaveBeenCalled();
  });
});
