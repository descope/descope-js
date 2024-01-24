import createSdk from '../src/index';

const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

describe('createSdk', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call "beforeRequest" and "afterRequest"', async () => {
    mockFetch.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        json: () => ({ data: 'data' }),
        text: () => '{"data": "data"}',
        headers: new Headers({ h: '1' }),
      }),
    );

    const beforeRequestHook = jest.fn().mockImplementation((config) => config);
    const afterRequestHook = jest.fn();
    const sdk = createSdk({
      projectId: '123',
      hooks: {
        beforeRequest: beforeRequestHook,
        afterRequest: afterRequestHook,
      },
    });

    await sdk.otp.signIn.email('1@1.com');
    expect(beforeRequestHook).toHaveBeenCalled();
    expect(afterRequestHook).toHaveBeenCalled();
  });
});
