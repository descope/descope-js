import { DEFAULT_BASE_API_URL } from '../src/constants';
import createHttpClient from '../src/httpClient';
import createFetchLogger from '../src/httpClient/helpers/createFetchLogger';
import { ExtendedResponse } from '../src/httpClient/types';

const mockFetch = jest.fn();
globalThis.fetch = mockFetch;

const afterRequestHook = jest.fn();

const descopeHeaders = {
  'x-descope-sdk-name': 'core-js',
  'x-descope-sdk-version': globalThis.BUILD_VERSION,
};

const httpClient = createHttpClient({
  baseUrl: 'http://descope.com',
  projectId: '456',
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
  projectId: '456',
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

  it('should call fetch with multiple params when calling "get"', () => {
    httpClient.get('1/2/3', {
      headers: { test2: '123' },
      queryParams: { test2: '123', test3: '456', test4: '789' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://descope.com/1/2/3?test2=123&test3=456&test4=789',
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
          'x-descope-sdk-name': 'lulu',
          'x-descope-sdk-version': globalThis.BUILD_VERSION,
        }),
        method: 'GET',
      },
    );
  });

  it('should use cookiePolicy when provided', () => {
    const httpClient = createHttpClient({
      baseUrl: 'http://descope.com',
      projectId: '456',
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
      projectId: '456',
      baseConfig: { baseHeaders: { test: '123' } },
      cookiePolicy: null,
    });

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
      projectId: '456',
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
      createHttpClient({ baseUrl: 'http://descope.com', projectId: '456' }).get,
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
      projectId: '456',
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
      headers: new Headers({ 'set-cookie': 'DSR=123; DS=456' }),
    });

    const res = await hookedHttpClient.post('1/2/3', {});

    expect(await res.json()).toEqual({
      test: 123,
      refreshJwt: '123',
      sessionJwt: '456',
    });
  });
});
