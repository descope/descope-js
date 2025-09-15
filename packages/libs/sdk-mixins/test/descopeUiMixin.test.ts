import { waitFor } from '@testing-library/dom';
import { descopeUiMixin } from '../src';

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
  const MixinClass = descopeUiMixin(
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
const originalCreateElement = document.createElement;
const scriptMock = Object.assign(document.createElement('script'), {
  setAttribute: jest.fn(),
  addEventListener: jest.fn(),
  onload: jest.fn(),
  onerror: jest.fn(),
});

jest.spyOn(document, 'createElement').mockImplementation((element) => {
  if (element.toLowerCase() === 'script') {
    return scriptMock;
  }
  return originalCreateElement.apply(document, [element]);
});

describe('descopeUiMixin', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should fetch descope ui prerequisites', async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(createResponse({ body: '{}', statusCode: 200 }));
    const mixin = createMixin({
      'base-static-url': 'https://static.example.com/pages',
      'project-id': '123',
      'base-url': 'https://example.com',
    });
    mixin.descopeUi;

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://static.example.com/pages/123/v2-beta/config.json',
        expect.any(Object),
      ),
    );
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
  });
});
