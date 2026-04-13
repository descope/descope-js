import { DEFAULT_BASE_API_URL } from '../src/constants';
import createHttpClient from '../src/httpClient';
import { getClientSessionId } from '../src/httpClient/helpers';
import createFetchLogger from '../src/httpClient/helpers/createFetchLogger';
import { ExtendedResponse } from '../src/httpClient/types';

const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

const afterRequestHook = jest.fn();

const projectId = '456';
const descopeHeaders = {
  'x-descope-sdk-name': 'core-js',
  'x-descope-sdk-version': globalThis.BUILD_VERSION,
  'x-descope-sdk-session-id': getClientSessionId(),
  'x-descope-project-id': projectId,
};

const httpClient = createHttpClient({
  baseUrl: 'http://descope.com',
  projectId,
  baseConfig: { baseHeaders: { test: '123' } },
});

const transformResponse = async (response: ExtendedResponse) => {
  const data = await response.json();

  if (response.cookies.DSR) {
    data.refreshJwt = response.cookies.DSR;
  }

  if (response.cookies.DS) {
    data.sessionJwt = response.cookies.DS;
  }

  return response;
};

const hookedHttpClient = createHttpClient({
  baseUrl: 'http://descope.com',
  projectId,
  baseConfig: { baseHeaders: { test: '123' } },
  hooks: {
    beforeRequest: (config) => {
      config.queryParams = { ...config.queryParams, moshe: 'yakov' };

      return config;
    },
    afterRequest: afterRequestHook,
    transformResponse,
  },
});

describe('httpClient', () => {
  beforeEach(() => {
    mockFetch.mockReturnValue({ text: () => JSON.stringify({}) });
  });

  it('should support multiple beforeRequest hooks (array) and apply in order', () => {
    const firstHook = jest.fn((config) => {
      config.queryParams = { ...config.queryParams, a: '1' };
      return config;
    });
    const secondHook = jest.fn((config) => {
      config.queryParams = { ...config.queryParams, b: '2' };
      return config;
    });

    const clientWithMultipleBefore = createHttpClient({
      baseUrl: 'http://descope.com',
      projectId,
      baseConfig: { baseHeaders: { test: '123' } },
      hooks: { beforeRequest: [firstHook, secondHook] },
    });

    clientWithMultipleBefore.get('path', { queryParams: { c: '3' } });

    expect(firstHook).toHaveBeenCalledTimes(1);
    expect(secondHook).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0][0];
    const url = new URL(calledUrl);
    expect(url.origin + url.pathname).toBe('http://descope.com/path');
    expect(url.searchParams.get('a')).toBe('1');
    expect(url.searchParams.get('b')).toBe('2');
    expect(url.searchParams.get('c')).toBe('3');
    expect(mockFetch.mock.calls[0][1]).toEqual(
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('should support multiple afterRequest hooks (array) and log errors without failing others', async () => {
    const logger = {
      log: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    };
    const goodAfter = jest.fn();
    const failingAfter = jest.fn(() =>
      Promise.reject(new Error('after failed')),
    );

    const clientWithMultipleAfter = createHttpClient({
      baseUrl: 'http://descope.com',
      projectId,
      logger,
      hooks: { afterRequest: [failingAfter, goodAfter] },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => '{}',
      url: 'http://descope.com/path',
      headers: new Headers({}),
      status: 200,
      statusText: 'OK',
    });

    await clientWithMultipleAfter.get('path');

    expect(failingAfter).toHaveBeenCalledTimes(1);
    expect(goodAfter).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalled();
  });

  it('should pick up hooks added after client creation', async () => {
    const cfg: any = {
      baseUrl: 'http://descope.com',
      projectId,
      baseConfig: { baseHeaders: { test: '123' } },
      hooks: {},
    };

    const client = createHttpClient(cfg);

    const beforeRequestHook = jest.fn((config) => config);
    const afterRequestHook = jest.fn();

    // mutate hooks after client creation
    cfg.hooks = {
      beforeRequest: [beforeRequestHook],
      afterRequest: [afterRequestHook],
    };

    await client.get('path');

    expect(beforeRequestHook).toHaveBeenCalledTimes(1);
    expect(afterRequestHook).toHaveBeenCalledTimes(1);
  });

  it('should use DEFAULT_BASE_API_URL when baseUrl is omitted', () => {
    const client = createHttpClient({
      projectId: 'P2aAc4T2V93bddihGEx2Ryhc8e5Z',
      baseUrl: '',
    });
    client.get('one/two/three', { token: null });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.descope.com/one/two/three',
      expect.anything(),
    );
  });

  it('should use DEFAULT_BASE_API_URL with region extraction when baseUrl is omitted', () => {
    const client = createHttpClient({
      projectId: 'Puse12aAc4T2V93bddihGEx2Ryhc8e5Z',
      baseUrl: '',
    });
    client.get('one/two/three', { token: null });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.use1.descope.com/one/two/three',
      expect.anything(),
    );
  });
  it('should call fetch with the correct params when calling "get"', () => {
    httpClient.get('1/2/3', {
      headers: { test2: '123' },
      queryParams: { test2: '123' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://descope.com/1/2/3?test2=123',
      {
        body: undefined,
        credentials: 'include',
        headers: new Headers({
          test2: '123',
          test: '123',
          Authorization: 'Bearer 456',
          ...descopeHeaders,
        }),
        method: 'GET',
      },
    );
  });

  it('should call fetch without ? when calling "get" without params', () => {
    httpClient.get('1/2/3', {
      queryParams: {},
    });

    expect(mockFetch).toHaveBeenCalledWith(`http://descope.com/1/2/3`, {
      body: undefined,
      credentials: 'include',
      headers: new Headers({
        test: '123',
        Authorization: 'Bearer 456',
        ...descopeHeaders,
      }),
      method: 'GET',
    });
  });

  it('should call fetch with multiple params when calling "get"', () => {
    httpClient.get('1/2/3', {
      headers: { test2: '123' },
      queryParams: {
        test2: '123',
        test3: '456',
        test4: '789',
        test5: `don't+forget+to@escape.urls`,
      },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `http://descope.com/1/2/3?test2=123&test3=456&test4=789&test5=don't%2Bforget%2Bto%40escape.urls`,
      {
        body: undefined,
        credentials: 'include',
        headers: new Headers({
          test2: '123',
          test: '123',
          Authorization: 'Bearer 456',
          ...descopeHeaders,
        }),
        method: 'GET',
      },
    );
  });

  it('should call the "afterHook"', async () => {
    await hookedHttpClient.post('1/2/3', {
      headers: { test2: '123' },
      queryParams: { test2: '123' },
    });

    expect(afterRequestHook).toHaveBeenCalledWith(
      expect.objectContaining({ path: '1/2/3' }),
      expect.objectContaining({
        text: expect.any(Function),
        json: expect.any(Function),
        clone: expect.any(Function),
      }),
    );
  });

  it('afterhook response should have the correct body', async () => {
    await hookedHttpClient.post('1/2/3', {
      headers: { test2: '123' },
      queryParams: { test2: '123' },
    });

    const response = afterRequestHook.mock.calls[0][1];

    expect(await response.text()).toBe('{}');
  });

  it('should call the "beforeRequest" hook to modify request config if needed', () => {
    hookedHttpClient.get('1/2/3', {
      headers: { test2: '123', 'x-descope-sdk-name': 'lulu' },
      queryParams: { test2: '123' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://descope.com/1/2/3?test2=123&moshe=yakov',
      {
        body: undefined,
        credentials: 'include',
        headers: new Headers({
          test2: '123',
          test: '123',
          Authorization: 'Bearer 456',
          ...descopeHeaders,
          'x-descope-sdk-name': 'lulu',
        }),
        method: 'GET',
      },
    );
  });

  it('should use cookiePolicy when provided', () => {
    const httpClient = createHttpClient({
      baseUrl: 'http://descope.com',
      projectId,
      baseConfig: { baseHeaders: { test: '123' } },
      cookiePolicy: 'same-origin',
    });

    httpClient.get('1/2/3', {
      headers: { test2: '123' },
      queryParams: { test2: '123', moshe: 'yakov' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://descope.com/1/2/3?test2=123&moshe=yakov',
      {
        body: undefined,
        credentials: 'same-origin',
        headers: new Headers({
          test2: '123',
          test: '123',
          Authorization: 'Bearer 456',
          ...descopeHeaders,
        }),
        method: 'GET',
      },
    );
  });

  it('should omit cookiePolicy when null is provided', () => {
    const httpClient = createHttpClient({
      baseUrl: 'http://descope.com',
      projectId,
      baseConfig: { baseHeaders: { test: '123' } },
      cookiePolicy: null,
    });

    httpClient.get('1/2/3/4', {
      headers: { test2: '123' },
      queryParams: { test2: '123' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://descope.com/1/2/3/4?test2=123',
      {
        body: undefined,
        headers: new Headers({
          test2: '123',
          test: '123',
          Authorization: 'Bearer 456',
          ...descopeHeaders,
        }),
        method: 'GET',
      },
    );

    httpClient.get('1/2/3', {
      headers: { test2: '123' },
      queryParams: { test2: '123' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://descope.com/1/2/3?test2=123',
      {
        body: undefined,
        headers: new Headers({
          test2: '123',
          test: '123',
          Authorization: 'Bearer 456',
          ...descopeHeaders,
        }),
        method: 'GET',
      },
    );
  });

  it('should call fetch with project id in bearer token when null is passed as a token', () => {
    const httpClient = createHttpClient({
      baseUrl: 'http://descope.com',
      projectId,
    });

    httpClient.get('1/2/3', { token: null });

    expect(mockFetch).toHaveBeenCalledWith('http://descope.com/1/2/3', {
      body: undefined,
      credentials: 'include',
      headers: new Headers({
        Authorization: 'Bearer 456',
        ...descopeHeaders,
      }),
      method: 'GET',
    });
  });

  it.each(['post', 'put'])(
    'should call fetch with the correct params when calling "%s"',
    (method) => {
      httpClient[method]('1/2/3', 'aaa', {
        headers: { test2: '123' },
        queryParams: { test2: '123' },
        token: '123',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://descope.com/1/2/3?test2=123',
        {
          body: JSON.stringify('aaa'),
          credentials: 'include',
          headers: new Headers({
            test2: '123',
            test: '123',
            Authorization: 'Bearer 456:123',
            ...descopeHeaders,
          }),
          method: method.toUpperCase(),
        },
      );
    },
  );

  it('http delete called with correct parameters', () => {
    httpClient['delete']('1/2/3', {
      headers: { test2: '123' },
      queryParams: { test2: '123' },
      token: '123',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://descope.com/1/2/3?test2=123',
      {
        body: undefined,
        credentials: 'include',
        headers: new Headers({
          test2: '123',
          test: '123',
          Authorization: 'Bearer 456:123',
          ...descopeHeaders,
        }),
        method: 'delete'.toUpperCase(),
      },
    );
  });

  it('should not throw when not providing config or logger', () => {
    expect(
      createHttpClient({ baseUrl: 'http://descope.com', projectId }).get,
    ).not.toThrow();
  });

  it('should extract region from the project id', () => {
    const httpClient = createHttpClient({
      baseUrl: DEFAULT_BASE_API_URL,
      projectId: 'Puse12aAc4T2V93bddihGEx2Ryhc8e5Z',
    });

    httpClient.get('1/2/3', { token: null });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.use1.descope.com/1/2/3',
      expect.anything(),
    );
  });

  it('should extract region from the project id when region is not provided', () => {
    const httpClient = createHttpClient({
      baseUrl: DEFAULT_BASE_API_URL,
      projectId: 'P2aAc4T2V93bddihGEx2Ryhc8e5Z',
    });

    httpClient.get('1/2/3', { token: null });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.descope.com/1/2/3',
      expect.anything(),
    );
  });
});

describe('createFetchLogger', () => {
  it('should log the request correctly', () => {
    const logger = {
      log: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    };
    const fetch = jest.fn();
    fetch.mockResolvedValueOnce({
      ok: true,
      text: () => 'resBody',
      url: 'http://descope.com/',
      headers: new Headers({ header: 'header' }),
    });
    const fetchWithLogger = createFetchLogger(logger, fetch);

    fetchWithLogger('http://descope.com/1/2/3', {
      body: 'reqBody',
      headers: new Headers({
        test: '123',
      }),
      method: 'POST',
    });

    expect(logger.log).toHaveBeenNthCalledWith(
      1,
      [
        'Request',
        'Url: http://descope.com/1/2/3',
        'Method: POST',
        'Headers: {"test":"123"}',
        'Body: reqBody',
      ].join('\n'),
    );
  });

  it('should log the response correctly', async () => {
    const logger = {
      log: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    };
    const fetch = jest.fn();
    fetch.mockResolvedValueOnce({
      ok: true,
      text: () => 'resBody',
      url: 'http://descope.com/',
      headers: new Headers({ header: 'header' }),
      status: 200,
      statusText: 'OK',
    });
    const fetchWithLogger = createFetchLogger(logger, fetch);

    await fetchWithLogger('http://descope.com/1/2/3', {
      body: 'reqBody',
      headers: new Headers({
        test: '123',
      }),
      method: 'POST',
    });

    expect(logger.log).toHaveBeenNthCalledWith(
      2,
      [
        'Response',
        'Url: http://descope.com/',
        'Status: 200 OK',
        'Headers: {"header":"header"}',
        'Body: resBody',
      ].join('\n'),
    );
  });

  it('should log the response correctly when there is an error', async () => {
    const logger = {
      log: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    };
    const fetch = jest.fn();
    fetch.mockResolvedValueOnce({
      ok: false,
      text: () => 'resBody',
      url: 'http://descope.com/',
      headers: new Headers({ header: 'header' }),
      status: 200,
      statusText: 'OK',
    });
    const fetchWithLogger = createFetchLogger(logger, fetch);

    await fetchWithLogger('http://descope.com/1/2/3', {
      body: 'reqBody',
      headers: new Headers({
        test: '123',
      }),
      method: 'POST',
    });

    expect(logger.error).toHaveBeenNthCalledWith(
      1,
      [
        'Response',
        'Url: http://descope.com/',
        'Status: 200 OK',
        'Headers: {"header":"header"}',
        'Body: resBody',
      ].join('\n'),
    );
  });

  it('should be able to call response.text() & response.json() after logging', async () => {
    const logger = {
      log: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    };
    const fetch = jest.fn();
    fetch.mockResolvedValueOnce({
      ok: false,
      text: () => '{"body": "body"}',
      url: 'http://descope.com/',
      headers: new Headers({ header: 'header' }),
      status: 200,
      statusText: 'OK',
    });
    const fetchWithLogger = createFetchLogger(logger, fetch);

    const resp = await fetchWithLogger('http://descope.com/1/2/3', {
      body: 'reqBody',
      headers: new Headers({
        test: '123',
      }),
      method: 'POST',
    });

    expect(resp.text()).resolves.toBe('{"body": "body"}');
    expect(resp.json()).resolves.toEqual({ body: 'body' });
  });

  it('should allow using baseurl with path', () => {
    const httpClient = createHttpClient({
      baseUrl: 'http://descope.com/auth/ds',
      projectId,
    });

    httpClient.get('1/2/3', {
      queryParams: { test2: '123' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://descope.com/auth/ds/1/2/3?test2=123',
      expect.anything(),
    );
  });

  it('should transform the response if "transformResponse hook is provided"', async () => {
    mockFetch.mockReturnValue({
      text: () => JSON.stringify({ test: 123 }),
      headers: new Headers({ 'set-cookie': 'DSR=123, DS=456' }),
    });

    const res = await hookedHttpClient.post('1/2/3', {});

    expect(await res.json()).toEqual({
      test: 123,
      refreshJwt: '123',
      sessionJwt: '456',
    });
  });

  describe('retry functionality', () => {
    let logger: any;
    let fetch: jest.Mock;
    let fetchWithLogger: any;

    beforeEach(() => {
      jest.useFakeTimers();
      logger = {
        log: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
      };
      fetch = jest.fn();
      fetchWithLogger = createFetchLogger(logger, fetch);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should retry when receiving status code 521', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: false,
          text: () => 'Cloudflare error',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header' }),
          status: 521,
          statusText: 'Web Server Is Down',
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => 'Success',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header' }),
          status: 200,
          statusText: 'OK',
        });

      const promise = fetchWithLogger('http://descope.com/test', {
        method: 'GET',
        headers: new Headers({ test: '123' }),
      });

      await jest.runAllTimersAsync();
      const response = await promise;

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(1, 'http://descope.com/test', {
        method: 'GET',
        headers: new Headers({ test: '123' }),
      });
      expect(fetch).toHaveBeenNthCalledWith(2, 'http://descope.com/test', {
        method: 'GET',
        headers: new Headers({ test: '123' }),
      });
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('Success');
    });

    it('should retry when receiving status code 524', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: false,
          text: () => 'Timeout occurred',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header' }),
          status: 524,
          statusText: 'A Timeout Occurred',
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => 'Success',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header' }),
          status: 200,
          statusText: 'OK',
        });

      const promise = fetchWithLogger('http://descope.com/test', {
        method: 'POST',
        body: 'test body',
        headers: new Headers({ test: '123' }),
      });

      await jest.runAllTimersAsync();
      const response = await promise;

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('Success');
    });

    it('should retry when receiving status code 503', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: false,
          text: () => 'Service Unavailable',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header' }),
          status: 503,
          statusText: 'Service Unavailable',
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => 'Success',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header' }),
          status: 200,
          statusText: 'OK',
        });

      const promise = fetchWithLogger('http://descope.com/test', {
        method: 'GET',
        headers: new Headers({ test: '123' }),
      });

      await jest.runAllTimersAsync();
      const response = await promise;

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('Success');
    });

    it('should retry when receiving status code 522', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: false,
          text: () => 'Connection Timed Out',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header' }),
          status: 522,
          statusText: 'Connection Timed Out',
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => 'Success',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header' }),
          status: 200,
          statusText: 'OK',
        });

      const promise = fetchWithLogger('http://descope.com/test', {
        method: 'GET',
        headers: new Headers({ test: '123' }),
      });

      await jest.runAllTimersAsync();
      const response = await promise;

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('Success');
    });

    it('should retry when receiving status code 530', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: false,
          text: () => 'Cloudflare error',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header' }),
          status: 530,
          statusText: 'Cloudflare Error',
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => 'Success',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header' }),
          status: 200,
          statusText: 'OK',
        });

      const promise = fetchWithLogger('http://descope.com/test', {
        method: 'GET',
        headers: new Headers({ test: '123' }),
      });

      await jest.runAllTimersAsync();
      const response = await promise;

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('Success');
    });

    it('should retry up to 3 times when all retries fail', async () => {
      // All 4 responses (original + 3 retries) fail
      fetch
        .mockResolvedValueOnce({
          ok: false,
          text: () => 'Error 1',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header' }),
          status: 503,
          statusText: 'Service Unavailable',
        })
        .mockResolvedValueOnce({
          ok: false,
          text: () => 'Error 2',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header' }),
          status: 503,
          statusText: 'Service Unavailable',
        })
        .mockResolvedValueOnce({
          ok: false,
          text: () => 'Error 3',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header' }),
          status: 503,
          statusText: 'Service Unavailable',
        })
        .mockResolvedValueOnce({
          ok: false,
          text: () => 'Error 4',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header' }),
          status: 503,
          statusText: 'Service Unavailable',
        });

      const promise = fetchWithLogger('http://descope.com/test', {
        method: 'GET',
        headers: new Headers({ test: '123' }),
      });

      await jest.runAllTimersAsync();
      const response = await promise;

      // Original + 3 retries = 4 total calls
      expect(fetch).toHaveBeenCalledTimes(4);
      expect(response.status).toBe(503);
      expect(await response.text()).toBe('Error 4');
      expect(response.retries).toBe(3);
    });

    it('should use correct delays: 100ms for first retry, 5000ms for subsequent retries', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: false,
          text: () => 'Error 1',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header' }),
          status: 503,
          statusText: 'Service Unavailable',
        })
        .mockResolvedValueOnce({
          ok: false,
          text: () => 'Error 2',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header' }),
          status: 503,
          statusText: 'Service Unavailable',
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => 'Success',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header' }),
          status: 200,
          statusText: 'OK',
        });

      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

      const promise = fetchWithLogger('http://descope.com/test', {
        method: 'GET',
        headers: new Headers({ test: '123' }),
      });

      await jest.runAllTimersAsync();
      await promise;

      // Verify delays: first retry 100ms, second retry 5000ms
      const delays = setTimeoutSpy.mock.calls.map((call) => call[1]);
      expect(delays).toContain(100);
      expect(delays).toContain(5000);
    });

    it('should not retry for other error status codes', async () => {
      const nonRetryStatusCodes = [400, 401, 403, 404, 500, 502];

      for (const statusCode of nonRetryStatusCodes) {
        fetch.mockClear();
        fetch.mockResolvedValueOnce({
          ok: false,
          text: () => `Error ${statusCode}`,
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header' }),
          status: statusCode,
          statusText: 'Error',
        });

        const promise = fetchWithLogger('http://descope.com/test', {
          method: 'GET',
          headers: new Headers({ test: '123' }),
        });

        await jest.runAllTimersAsync();
        const response = await promise;

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(response.status).toBe(statusCode);
      }
    });

    it('should return the last failed response when all retries fail', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: false,
          text: () => 'First error',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header1' }),
          status: 521,
          statusText: 'Web Server Is Down',
        })
        .mockResolvedValueOnce({
          ok: false,
          text: () => 'Second error',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header2' }),
          status: 521,
          statusText: 'Web Server Is Down',
        })
        .mockResolvedValueOnce({
          ok: false,
          text: () => 'Third error',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header3' }),
          status: 521,
          statusText: 'Web Server Is Down',
        })
        .mockResolvedValueOnce({
          ok: false,
          text: () => 'Fourth error',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header4' }),
          status: 521,
          statusText: 'Web Server Is Down',
        });

      const promise = fetchWithLogger('http://descope.com/test', {
        method: 'GET',
        headers: new Headers({ test: '123' }),
      });

      await jest.runAllTimersAsync();
      const response = await promise;

      // Original + 3 retries = 4 total calls
      expect(fetch).toHaveBeenCalledTimes(4);
      expect(response.status).toBe(521);
      expect(await response.text()).toBe('Fourth error');
    });

    it('should log both the original request and final response after retry', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: false,
          text: () => 'Error',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header' }),
          status: 521,
          statusText: 'Web Server Is Down',
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => 'Success',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header' }),
          status: 200,
          statusText: 'OK',
        });

      const promise = fetchWithLogger('http://descope.com/test', {
        method: 'GET',
        headers: new Headers({ test: '123' }),
        body: undefined,
      });

      await jest.runAllTimersAsync();
      await promise;

      expect(logger.log).toHaveBeenCalledTimes(2);
      expect(logger.log).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('Request'),
      );
      expect(logger.error).toHaveBeenCalledTimes(0);
      expect(logger.log).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('200 OK'),
      );
    });

    it('should maintain response object methods after retry', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: false,
          text: () => '{"error": "server down"}',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header' }),
          status: 521,
          statusText: 'Web Server Is Down',
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => '{"success": true}',
          url: 'http://descope.com/',
          headers: new Headers({ header: 'header' }),
          status: 200,
          statusText: 'OK',
        });

      const promise = fetchWithLogger('http://descope.com/test', {
        method: 'GET',
        headers: new Headers({ test: '123' }),
      });

      await jest.runAllTimersAsync();
      const response = await promise;

      expect(await response.text()).toBe('{"success": true}');
      expect(await response.json()).toEqual({ success: true });
      expect(response.clone()).toBe(response);
    });

    it('should log the correct message when retries', async () => {
      const logger = {
        log: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
      };

      const httpClient = createHttpClient({
        baseUrl: 'http://descope.com',
        projectId: '123',
        hooks: {
          afterRequest: afterRequestHook,
        },
        logger,
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          text: () => '{"error": "timeout"}',
          json: () => Promise.resolve({ error: 'timeout' }),
          url: 'http://descope.com/test',
          headers: new Headers({ header: 'header' }),
          status: 524,
          statusText: 'A Timeout Occurred',
          clone: function () {
            return this;
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => '{"success": true}',
          json: () => Promise.resolve({ success: true }),
          url: 'http://descope.com/test',
          headers: new Headers({ header: 'header' }),
          status: 200,
          statusText: 'OK',
          clone: function () {
            return this;
          },
        });

      const promise = httpClient.post('test', { data: 'test' });
      await jest.runAllTimersAsync();
      await promise;

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Retries: 1'),
      );
    });

    it('should log the correct message when no retries', async () => {
      const logger = {
        log: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
      };

      const httpClient = createHttpClient({
        baseUrl: 'http://descope.com',
        projectId: '123',
        hooks: {
          afterRequest: afterRequestHook,
        },
        logger,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => '{"success": true}',
        json: () => Promise.resolve({ success: true }),
        url: 'http://descope.com/test',
        headers: new Headers({ header: 'header' }),
        status: 200,
        statusText: 'OK',
        clone: function () {
          return this;
        },
      });

      const promise = httpClient.post('test', { data: 'test' });
      await jest.runAllTimersAsync();
      await promise;

      expect(logger.log).toHaveBeenCalledWith(
        expect.not.stringContaining('Retries:'),
      );
    });
  });

  describe('retry functionality with hooks', () => {
    let beforeRequestHook: jest.Mock;
    let afterRequestHook: jest.Mock;
    let transformResponseHook: jest.Mock;
    let mockFetch: jest.Mock;

    beforeEach(() => {
      jest.useFakeTimers();
      beforeRequestHook = jest.fn((config) => {
        config.queryParams = { ...config.queryParams, hookParam: 'added' };
        return config;
      });

      afterRequestHook = jest.fn();

      transformResponseHook = jest.fn(async (response) => {
        const data = await response.json();
        data.transformed = true;
        return response;
      });

      mockFetch = jest.fn();
      global.fetch = mockFetch;
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should call beforeRequest hook only once even with retry', async () => {
      const httpClient = createHttpClient({
        baseUrl: 'http://descope.com',
        projectId: '123',
        hooks: {
          beforeRequest: beforeRequestHook,
          afterRequest: afterRequestHook,
        },
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          text: () => '{"error": "server down"}',
          json: () => Promise.resolve({ error: 'server down' }),
          url: 'http://descope.com/test',
          headers: new Headers({ header: 'header' }),
          status: 521,
          statusText: 'Web Server Is Down',
          clone: function () {
            return this;
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => '{"success": true}',
          json: () => Promise.resolve({ success: true }),
          url: 'http://descope.com/test',
          headers: new Headers({ header: 'header' }),
          status: 200,
          statusText: 'OK',
          clone: function () {
            return this;
          },
        });

      const promise = httpClient.get('test');
      await jest.runAllTimersAsync();
      await promise;

      expect(beforeRequestHook).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('hookParam=added'),
        expect.any(Object),
      );
    });

    it('should call afterRequest hook only once even with retry', async () => {
      const httpClient = createHttpClient({
        baseUrl: 'http://descope.com',
        projectId: '123',
        hooks: {
          afterRequest: afterRequestHook,
        },
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          text: () => '{"error": "timeout"}',
          json: () => Promise.resolve({ error: 'timeout' }),
          url: 'http://descope.com/test',
          headers: new Headers({ header: 'header' }),
          status: 524,
          statusText: 'A Timeout Occurred',
          clone: function () {
            return this;
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => '{"success": true}',
          json: () => Promise.resolve({ success: true }),
          url: 'http://descope.com/test',
          headers: new Headers({ header: 'header' }),
          status: 200,
          statusText: 'OK',
          clone: function () {
            return this;
          },
        });

      const promise = httpClient.post('test', { data: 'test' });
      await jest.runAllTimersAsync();
      await promise;

      expect(afterRequestHook).toHaveBeenCalledTimes(1);
      const response = afterRequestHook.mock.calls[0][1];
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('{"success": true}');
    });

    it('should call transformResponse only once with the final response', async () => {
      const httpClient = createHttpClient({
        baseUrl: 'http://descope.com',
        projectId: '123',
        hooks: {
          transformResponse: transformResponseHook,
        },
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          text: () => '{"error": "server down"}',
          json: () => Promise.resolve({ error: 'server down' }),
          url: 'http://descope.com/test',
          headers: new Headers({ header: 'header' }),
          status: 521,
          statusText: 'Web Server Is Down',
          clone: function () {
            return this;
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => '{"data": "value"}',
          json: () => Promise.resolve({ data: 'value' }),
          url: 'http://descope.com/test',
          headers: new Headers({ header: 'header' }),
          status: 200,
          statusText: 'OK',
          clone: function () {
            return this;
          },
        });

      const promise = httpClient.get('test');
      await jest.runAllTimersAsync();
      const response = await promise;

      expect(transformResponseHook).toHaveBeenCalledTimes(1);
      const transformedResponse = transformResponseHook.mock.calls[0][0];
      expect(transformedResponse.status).toBe(200);

      const responseData = await response.json();
      expect(responseData).toEqual({ data: 'value', transformed: true });
    });
  });
});
