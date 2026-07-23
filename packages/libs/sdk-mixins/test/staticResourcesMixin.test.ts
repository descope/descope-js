import { staticResourcesMixin, getResourceUrl } from '../src';

const createResponse = async ({
  body,
  statusCode = 200,
  headers = {},
}: {
  body: string;
  statusCode: number;
  headers?: Record<string, string>;
}) => ({
  json: async () => JSON.parse(body),
  text: async () => body,
  ok: statusCode < 400,
  headers: new Map(Object.entries(headers)),
});

const createMixin = (config: Record<string, any>) => {
  const MixinClass = staticResourcesMixin(
    class {
      getAttribute(attr: string) {
        return config[attr];
      }
    } as any,
  );

  const mixin = new MixinClass();

  // Create mock logger functions that can be tracked
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };

  // Set the logger which will be wrapped by the mixin
  mixin.logger = mockLogger;

  return { mixin, mockLogger };
};

describe('staticResourcesMixin', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should fetch resource from static base url', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(createResponse({ body: '{}', statusCode: 400 }));
    const { mixin } = createMixin({
      'base-static-url': 'https://static.example.com/pages',
      'project-id': '123',
      'base-url': 'https://example.com',
    });
    await mixin.fetchStaticResource('file', 'json');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://static.example.com/pages/123/v2-beta/file',
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('should try to fetch resource from base url if there is no static content', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(createResponse({ body: '{}', statusCode: 400 }));
    const { mixin, mockLogger } = createMixin({
      'project-id': '123',
      'base-url': 'https://example.com',
    });
    await mixin.fetchStaticResource('file', 'json');

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://example.com/pages/123/v2-beta/file',
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      'https://static.descope.com/pages/123/v2-beta/file',
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      3,
      'https://static2.descope.com/pages/123/v2-beta/file',
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('should fetch resource from default url if there is no base url and base static url', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(createResponse({ body: '{}', statusCode: 400 }));
    const { mixin, mockLogger } = createMixin({ 'project-id': '123' });
    await mixin.fetchStaticResource('file', 'json');

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://static.descope.com/pages/123/v2-beta/file',
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      'https://static2.descope.com/pages/123/v2-beta/file',
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('should keep fetching content from base url in case it was ok', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(createResponse({ body: '{}', statusCode: 200 }));
    const { mixin, mockLogger } = createMixin({
      'project-id': '123',
      'base-url': 'https://example.com',
    });
    await mixin.fetchStaticResource('file', 'json');

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://example.com/pages/123/v2-beta/file',
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(createResponse({ body: '{}', statusCode: 400 }));

    await mixin.fetchStaticResource('file2', 'json');
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://example.com/pages/123/v2-beta/file2',
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('should not keep fetching content from base url in case it was not ok', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(createResponse({ body: '{}', statusCode: 400 }))
      .mockResolvedValueOnce(createResponse({ body: '{}', statusCode: 400 }))
      .mockResolvedValueOnce(createResponse({ body: '{}', statusCode: 200 }));
    const { mixin, mockLogger } = createMixin({
      'project-id': '123',
      'base-url': 'https://example.com',
    });
    await mixin.fetchStaticResource('file', 'json');

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://example.com/pages/123/v2-beta/file',
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);

    // Second fetch: fallback URL was cached, so it uses only that
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(createResponse({ body: '{}', statusCode: 200 }));

    await mixin.fetchStaticResource('file2', 'json');
    // Fallback URL is cached and used directly
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://static2.descope.com/pages/123/v2-beta/file2',
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('should fetch resource with text format', async () => {
    const textBody = 'plain text content';
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(createResponse({ body: textBody, statusCode: 200 }));
    const { mixin, mockLogger } = createMixin({
      'project-id': '123',
      'base-url': 'https://example.com',
    });
    const result = await mixin.fetchStaticResource('file.txt', 'text');

    expect(result.body).toBe(textBody);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://example.com/pages/123/v2-beta/file.txt',
      expect.any(Object),
    );
  });

  it('should return headers from the response', async () => {
    const responseHeaders = {
      'content-type': 'application/json',
      'cache-control': 'max-age=3600',
    };
    globalThis.fetch = jest.fn().mockResolvedValue(
      createResponse({
        body: '{"data":"value"}',
        statusCode: 200,
        headers: responseHeaders,
      }),
    );
    const { mixin, mockLogger } = createMixin({
      'project-id': '123',
      'base-url': 'https://example.com',
    });
    const result = await mixin.fetchStaticResource('file.json', 'json');

    expect(result.headers).toEqual(responseHeaders);
    expect(result.body).toEqual({ data: 'value' });
  });

  it('should log error when all fetch attempts fail', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(createResponse({ body: '{}', statusCode: 500 }));
    const { mixin, mockLogger } = createMixin({
      'project-id': '123',
      'base-url': 'https://example.com',
    });
    const result = await mixin.fetchStaticResource('file', 'json');

    expect(result).toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error fetching URL'),
    );
  });

  it('should retry on network error', async () => {
    const networkError = new Error('Network failure');
    globalThis.fetch = jest
      .fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce(
        createResponse({ body: '{"success":true}', statusCode: 200 }),
      );
    const { mixin, mockLogger } = createMixin({
      'base-static-url': 'https://static.example.com/pages',
      'project-id': '123',
    });
    const result = await mixin.fetchStaticResource('file', 'json');

    expect(result.body).toEqual({ success: true });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Network error'),
    );
  });

  it('should log error when network errors persist through retries', async () => {
    const networkError = new Error('Persistent network failure');
    globalThis.fetch = jest
      .fn()
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError);
    const { mixin, mockLogger } = createMixin({
      'base-static-url': 'https://static.example.com/pages',
      'project-id': '123',
    });
    const result = await mixin.fetchStaticResource('file', 'json');

    expect(result).toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Network error'),
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error fetching URL'),
    );
  });

  it('should handle multiple fallback URLs when all fail with exceptions', async () => {
    const networkError = new Error('Connection refused');
    globalThis.fetch = jest
      .fn()
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError);
    const { mixin, mockLogger } = createMixin({
      'project-id': '123',
      'base-url': 'https://example.com',
    });
    const result = await mixin.fetchStaticResource('file', 'json');

    expect(result).toBeUndefined();
    // Should try 3 URLs (base URL, BASE_CONTENT_URL, fallback), stopping after all fail
    expect(globalThis.fetch).toHaveBeenCalledTimes(5);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error fetching URL'),
    );
  });

  it('should reset working base url when base url changes', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(createResponse({ body: '{}', statusCode: 200 }));
    const config = {
      'project-id': '123',
      'base-url': 'https://example.com',
    };
    const { mixin, mockLogger } = createMixin(config);

    // First fetch - establishes working base URL
    await mixin.fetchStaticResource('file1', 'json');
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://example.com/pages/123/v2-beta/file1',
      expect.any(Object),
    );

    // Change base URL
    config['base-url'] = 'https://newexample.com';

    // Second fetch - should try new base URL
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(createResponse({ body: '{}', statusCode: 200 }));
    await mixin.fetchStaticResource('file2', 'json');
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://newexample.com/pages/123/v2-beta/file2',
      expect.any(Object),
    );
  });

  it('should fall back to default URL when base URL fails after being changed', async () => {
    const config = {
      'project-id': '123',
      'base-url': 'https://example.com',
    };
    const { mixin, mockLogger } = createMixin(config);

    // First fetch - base URL succeeds
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(createResponse({ body: '{}', statusCode: 200 }));
    await mixin.fetchStaticResource('file1', 'json');

    // Change base URL
    config['base-url'] = 'https://newexample.com';

    // Second fetch - new base URL fails, should fallback to default
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(createResponse({ body: '{}', statusCode: 404 }))
      .mockResolvedValueOnce(
        createResponse({ body: '{"fallback":true}', statusCode: 200 }),
      );
    const result = await mixin.fetchStaticResource('file2', 'json');

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://newexample.com/pages/123/v2-beta/file2',
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      'https://static.descope.com/pages/123/v2-beta/file2',
      expect.any(Object),
    );
    expect(result.body).toEqual({ fallback: true });
  });

  it('should log debug messages during fallback attempts', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(createResponse({ body: '{}', statusCode: 404 }))
      .mockResolvedValueOnce(createResponse({ body: '{}', statusCode: 200 }));
    const { mixin, mockLogger } = createMixin({
      'project-id': '123',
      'base-url': 'https://example.com',
    });
    await mixin.fetchStaticResource('file', 'json');

    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Error fetching URL'),
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Successfully fetched URL'),
    );
  });

  it('should use cache default option when fetching', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(createResponse({ body: '{}', statusCode: 200 }));
    const { mixin, mockLogger } = createMixin({
      'base-static-url': 'https://static.example.com/pages',
      'project-id': '123',
    });
    await mixin.fetchStaticResource('file', 'json');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ cache: 'default' }),
    );
  });

  it('should fallback to BASE_CONTENT_URL_FALLBACK when BASE_CONTENT_URL fails', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(createResponse({ body: '{}', statusCode: 404 }))
      .mockResolvedValueOnce(createResponse({ body: '{}', statusCode: 404 }))
      .mockResolvedValueOnce(
        createResponse({ body: '{"fallback":true}', statusCode: 200 }),
      );
    const { mixin } = createMixin({
      'project-id': '123',
      'base-url': 'https://example.com',
    });
    const result = await mixin.fetchStaticResource('file', 'json');

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://example.com/pages/123/v2-beta/file',
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      'https://static.descope.com/pages/123/v2-beta/file',
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      3,
      'https://static2.descope.com/pages/123/v2-beta/file',
      expect.any(Object),
    );
    expect(result.body).toEqual({ fallback: true });
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('should cache and use fallback URL when it succeeds', async () => {
    const { mixin } = createMixin({
      'project-id': '123',
      'base-url': 'https://example.com',
    });

    // First fetch: baseUrl and BASE_CONTENT_URL fail, fallback succeeds
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(createResponse({ body: '{}', statusCode: 404 }))
      .mockResolvedValueOnce(createResponse({ body: '{}', statusCode: 404 }))
      .mockResolvedValueOnce(
        createResponse({ body: '{"success":true}', statusCode: 200 }),
      );
    await mixin.fetchStaticResource('file1', 'json');

    // Verify that fallback IS cached and used directly
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        createResponse({ body: '{"fallback":true}', statusCode: 200 }),
      );
    const result = await mixin.fetchStaticResource('file2', 'json');

    // Should use cached fallback URL directly (1 call)
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://static2.descope.com/pages/123/v2-beta/file2',
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(result.body).toEqual({ fallback: true });
  });

  it('should always use fallback array when BASE_CONTENT_URL is cached', async () => {
    const { mixin } = createMixin({
      'project-id': '123',
      'base-url': 'https://example.com',
    });

    // First fetch: baseUrl fails, BASE_CONTENT_URL succeeds
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(createResponse({ body: '{}', statusCode: 404 }))
      .mockResolvedValueOnce(
        createResponse({ body: '{"success":true}', statusCode: 200 }),
      );
    await mixin.fetchStaticResource('file1', 'json');

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);

    // Second fetch: should still return array with fallback
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        createResponse({ body: '{"primary":true}', statusCode: 200 }),
      );
    const result = await mixin.fetchStaticResource('file2', 'json');

    // Should try BASE_CONTENT_URL first (it's cached)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://static.descope.com/pages/123/v2-beta/file2',
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(result.body).toEqual({ primary: true });
  });

  it('should fallback to BASE_CONTENT_URL_FALLBACK when cached BASE_CONTENT_URL fails', async () => {
    const { mixin } = createMixin({
      'project-id': '123',
      'base-url': 'https://example.com',
    });

    // First fetch: baseUrl fails, BASE_CONTENT_URL succeeds and gets cached
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(createResponse({ body: '{}', statusCode: 404 }))
      .mockResolvedValueOnce(
        createResponse({ body: '{"success":true}', statusCode: 200 }),
      );
    await mixin.fetchStaticResource('file1', 'json');

    // Second fetch: BASE_CONTENT_URL is now down, should fallback
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(createResponse({ body: '{}', statusCode: 503 }))
      .mockResolvedValueOnce(
        createResponse({ body: '{"fallback":true}', statusCode: 200 }),
      );
    const result = await mixin.fetchStaticResource('file2', 'json');

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://static.descope.com/pages/123/v2-beta/file2',
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      'https://static2.descope.com/pages/123/v2-beta/file2',
      expect.any(Object),
    );
    expect(result.body).toEqual({ fallback: true });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('should use fallback URL when no base url is configured', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(createResponse({ body: '{}', statusCode: 500 }))
      .mockResolvedValueOnce(
        createResponse({ body: '{"fallback":true}', statusCode: 200 }),
      );
    const { mixin } = createMixin({
      'project-id': '123',
    });
    const result = await mixin.fetchStaticResource('file', 'json');

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://static.descope.com/pages/123/v2-beta/file',
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      'https://static2.descope.com/pages/123/v2-beta/file',
      expect.any(Object),
    );
    expect(result.body).toEqual({ fallback: true });
  });
});

describe('getResourceUrl', () => {
  it('should generate correct URL with default assets folder', () => {
    const url = getResourceUrl({
      projectId: '123',
      filename: 'test.json',
    });

    expect(url.toString()).toBe(
      'https://static.descope.com/pages/123/v2-beta/test.json',
    );
    expect(url.baseUrl).toBe('https://static.descope.com/pages');
  });

  it('should generate correct URL with custom assets folder', () => {
    const url = getResourceUrl({
      projectId: '456',
      filename: 'config.json',
      assetsFolder: 'custom-folder',
    });

    expect(url.toString()).toBe(
      'https://static.descope.com/pages/456/custom-folder/config.json',
    );
  });

  it('should generate correct URL with custom base URL', () => {
    const url = getResourceUrl({
      projectId: '789',
      filename: 'data.json',
      baseUrl: 'https://custom.example.com/static',
    });

    expect(url.toString()).toBe(
      'https://custom.example.com/static/789/v2-beta/data.json',
    );
    expect(url.baseUrl).toBe('https://custom.example.com/static');
  });

  it('should preserve baseUrl property on URL object', () => {
    const customBase = 'https://cdn.example.com';
    const url = getResourceUrl({
      projectId: 'proj123',
      filename: 'file.txt',
      baseUrl: customBase,
    });

    expect(url.baseUrl).toBe(customBase);
  });

  it('should handle paths with existing pathname in base URL', () => {
    const url = getResourceUrl({
      projectId: '123',
      filename: 'test.json',
      baseUrl: 'https://example.com/api/v1',
    });

    expect(url.pathname).toBe('/api/v1/123/v2-beta/test.json');
  });
});
