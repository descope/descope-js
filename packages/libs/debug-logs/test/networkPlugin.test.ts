import {
  NetworkPlugin,
  extractMethod,
  extractUrl,
  extractRequestHeaders,
  extractResponseHeaders,
  normalizeUrl,
  shouldCaptureUrl,
} from '../src/plugins/networkPlugin';
import { createMockPluginContext, mockRecord, waitFor } from './setup';

describe('NetworkPlugin', () => {
  let plugin: NetworkPlugin | undefined;
  let originalFetch: typeof window.fetch;
  let OriginalXMLHttpRequest: typeof window.XMLHttpRequest;

  beforeEach(() => {
    originalFetch = window.fetch;
    OriginalXMLHttpRequest = window.XMLHttpRequest;
    mockRecord.mockClear();
  });

  afterEach(() => {
    plugin?.disable();
    window.fetch = originalFetch;
    window.XMLHttpRequest = OriginalXMLHttpRequest;
  });

  it('records fetch request and response headers', async () => {
    window.fetch = jest.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers({
        'content-type': 'application/json',
        'x-response': 'yes',
      }),
    }) as typeof window.fetch;

    plugin = new NetworkPlugin();
    plugin.load(createMockPluginContext());

    await fetch('https://api.example.com/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer secret',
      },
    });

    expect(mockRecord).toHaveBeenCalledWith(
      'network_request',
      expect.objectContaining({
        transport: 'fetch',
        url: 'https://api.example.com/users',
        requestHeaders: expect.objectContaining({
          'content-type': 'application/json',
          authorization: 'Bearer secret',
        }),
        responseHeaders: expect.objectContaining({
          'content-type': 'application/json',
          'x-response': 'yes',
        }),
      }),
    );
  });

  it('records fetch errors and truncates oversized headers', async () => {
    const errorObject = new Error('boom');
    window.fetch = jest
      .fn()
      .mockRejectedValueOnce(errorObject)
      .mockRejectedValueOnce('plain failure') as typeof window.fetch;

    plugin = new NetworkPlugin({ maxHeaderLength: 16 });
    plugin.load(createMockPluginContext());

    await expect(
      fetch('https://api.example.com/users', {
        method: 'PATCH',
        headers: {
          'X-Test': 'value',
        },
      }),
    ).rejects.toThrow('boom');

    await expect(
      fetch('https://api.example.com/users', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${'x'.repeat(128)}`,
        },
      }),
    ).rejects.toEqual('plain failure');

    expect(mockRecord).toHaveBeenCalledWith(
      'network_error',
      expect.objectContaining({
        transport: 'fetch',
        method: 'PATCH',
        error: 'boom',
      }),
    );

    expect(mockRecord).toHaveBeenCalledWith(
      'network_error',
      expect.objectContaining({
        transport: 'fetch',
        method: 'DELETE',
        error: 'plain failure',
        requestHeaders: expect.objectContaining({
          authorization: expect.stringContaining('... [truncated]'),
        }),
      }),
    );
  });

  it('respects URL filters', async () => {
    window.fetch = jest.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers({}),
    }) as typeof window.fetch;

    plugin = new NetworkPlugin({ urlFilter: [/^https:\/\/api\./] });
    plugin.load(createMockPluginContext());

    await fetch('https://other.example.com/users');

    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('records xhr headers and response headers', async () => {
    class MockXMLHttpRequest {
      public status = 200;
      public statusText = 'OK';
      public responseURL = 'https://api.example.com/users';
      private listeners: Record<string, EventListener[]> = {};

      open(): void {
        // noop - plugin captures args via patched method
      }

      setRequestHeader(): void {
        // noop - plugin intercepts before calling original
      }

      addEventListener(type: string, handler: EventListener): void {
        if (!this.listeners[type]) {
          this.listeners[type] = [];
        }
        this.listeners[type].push(handler);
      }

      removeEventListener(type: string, handler: EventListener): void {
        this.listeners[type] = (this.listeners[type] || []).filter(
          (h) => h !== handler,
        );
      }

      send(): void {
        setTimeout(() => {
          (this.listeners['load'] || []).forEach((handler) =>
            handler(new Event('load')),
          );
        }, 0);
      }

      getAllResponseHeaders(): string {
        return 'content-type: application/json\nx-response: ok';
      }
    }

    window.XMLHttpRequest = MockXMLHttpRequest as any;

    plugin = new NetworkPlugin();
    plugin.load(createMockPluginContext());

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', 'https://api.example.com/users');
    xhr.setRequestHeader('X-Test', '123');
    xhr.send();

    await waitFor(5);

    expect(mockRecord).toHaveBeenCalledWith(
      'network_request',
      expect.objectContaining({
        transport: 'xhr',
        requestHeaders: expect.objectContaining({ 'x-test': '123' }),
        responseHeaders: expect.objectContaining({
          'content-type': 'application/json',
          'x-response': 'ok',
        }),
      }),
    );
  });

  it('records xhr error events and falls back to responseURL metadata', async () => {
    class ErrorXMLHttpRequest {
      public status = 500;
      public statusText = 'FAIL';
      public responseURL = 'https://api.example.com/error';
      private listeners: Record<string, EventListener[]> = {};

      open(): void {
        // noop to keep plugin metadata empty
      }

      setRequestHeader(): void {
        // noop - plugin intercepts before delegating
      }

      addEventListener(type: string, handler: EventListener): void {
        if (!this.listeners[type]) {
          this.listeners[type] = [];
        }
        this.listeners[type].push(handler);
      }

      removeEventListener(type: string, handler: EventListener): void {
        this.listeners[type] = (this.listeners[type] || []).filter(
          (h) => h !== handler,
        );
      }

      send(): void {
        setTimeout(() => {
          (this.listeners['error'] || []).forEach((handler) =>
            handler(new Event('error')),
          );
        }, 0);
      }

      getAllResponseHeaders(): string {
        return '';
      }
    }

    window.XMLHttpRequest = ErrorXMLHttpRequest as any;

    plugin = new NetworkPlugin();
    plugin.load(createMockPluginContext());

    const xhr = new XMLHttpRequest();
    xhr.setRequestHeader('', 'ignored');
    xhr.setRequestHeader('X-Real', 'value');
    xhr.send();

    await waitFor(5);

    expect(mockRecord).toHaveBeenCalledWith(
      'network_error',
      expect.objectContaining({
        transport: 'xhr',
        url: 'https://api.example.com/error',
        method: 'GET',
        error: 'error',
        requestHeaders: expect.objectContaining({ 'x-real': 'value' }),
      }),
    );
  });

  it('skips xhr instrumentation when XMLHttpRequest is unavailable', () => {
    window.XMLHttpRequest = undefined as any;

    plugin = new NetworkPlugin();

    expect(() => plugin!.load(createMockPluginContext())).not.toThrow();
  });

  it('provides helper behaviors for request parsing utilities', () => {
    plugin = new NetworkPlugin();

    const originalRequestCtor = (globalThis as any).Request;
    const originalWindowRequest = (window as any).Request;
    class MockRequest {
      public method: string;
      public headers: Headers;

      constructor(
        public url: string,
        init: RequestInit = {},
      ) {
        this.method = (init.method || 'GET').toUpperCase();
        this.headers = new Headers(init.headers);
      }
    }

    (globalThis as any).Request = MockRequest;
    (window as any).Request = MockRequest;

    const request = new MockRequest('https://api.example.com/users?foo=bar', {
      method: 'put',
      headers: new Headers({ 'X-One': '1' }),
    });

    const truncate = (value: string) => value;
    const headers = extractRequestHeaders(
      request as any,
      {
        headers: [
          ['X-Two', '2'],
          ['X-Three', '3'],
        ],
      },
      truncate,
    );

    expect(headers).toMatchObject({
      'x-one': '1',
      'x-two': '2',
      'x-three': '3',
    });

    expect(extractMethod(request as any, undefined)).toBe('PUT');
    expect(extractUrl(new URL('https://api.example.com/foo'))).toBe(
      'https://api.example.com/foo',
    );
    expect(extractUrl(request as any)).toContain('https://api.example.com');

    (globalThis as any).Request = undefined;
    (window as any).Request = undefined;

    try {
      expect(extractMethod(request as any, undefined)).toBe('GET');
      expect(extractUrl(request as any)).toBe(String(request));
    } finally {
      (globalThis as any).Request = originalRequestCtor;
      (window as any).Request = originalWindowRequest;
    }

    const responseWithoutHeaders = {
      headers: undefined,
    } as unknown as Response;
    expect(extractResponseHeaders(responseWithoutHeaders, (v) => v)).toEqual(
      {},
    );

    const normalized = normalizeUrl('/relative/path');
    expect(normalized).toBe(
      new URL('/relative/path', window.location.href).toString(),
    );
    expect(normalizeUrl('http://example.com:bad')).toBe(
      'http://example.com:bad',
    );

    const consoleSpy = jest
      .spyOn(console, 'debug')
      .mockImplementation(() => {});
    const badFilter = [
      {
        test: () => {
          throw new Error('boom');
        },
      } as unknown as RegExp,
    ];
    plugin = new NetworkPlugin({ urlFilter: badFilter });

    expect(shouldCaptureUrl('', [badFilter[0]])).toBe(false);
    expect(shouldCaptureUrl('https://api.example.com', [badFilter[0]])).toBe(
      false,
    );
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
