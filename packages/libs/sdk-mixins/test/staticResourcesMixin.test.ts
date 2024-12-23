import { staticResourcesMixin } from '../src';

const createResponse = async ({
  body,
  statusCode = 200,
}: {
  body: string;
  statusCode: number;
}) => ({
  json: async () => JSON.parse(body),
  text: async () => body,
  ok: statusCode < 400,
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

  mixin.logger = { debug: jest.fn() };

  return mixin;
};

describe('staticResourcesMixin', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should fetch resource from static base url', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(createResponse({ body: '{}', statusCode: 400 }));
    const mixin = createMixin({
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
    const mixin = createMixin({
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
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('should fetch resource from default url if there is no base url and base static url', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(createResponse({ body: '{}', statusCode: 400 }));
    const mixin = createMixin({ 'project-id': '123' });
    await mixin.fetchStaticResource('file', 'json');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://static.descope.com/pages/123/v2-beta/file',
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('should keep fetching content from base url in case it was ok', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(createResponse({ body: '{}', statusCode: 200 }));
    const mixin = createMixin({
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
      .mockResolvedValueOnce(createResponse({ body: '{}', statusCode: 400 }));
    const mixin = createMixin({
      'project-id': '123',
      'base-url': 'https://example.com',
    });
    await mixin.fetchStaticResource('file', 'json');

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://example.com/pages/123/v2-beta/file',
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);

    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(createResponse({ body: '{}', statusCode: 400 }));

    await mixin.fetchStaticResource('file2', 'json');
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://static.descope.com/pages/123/v2-beta/file2',
      expect.any(Object),
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
