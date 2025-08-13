import { DEFAULT_BASE_API_URL } from '../constants';
import { getClientSessionId, transformSetCookie } from './helpers';
import createFetchLogger from './helpers/createFetchLogger';
import {
  AfterRequest,
  BeforeRequest,
  CreateHttpClientConfig,
  HttpClient,
  HTTPMethods,
  MultipleHooks,
  RequestConfig,
} from './types';
import { urlBuilder } from './urlBuilder';
import { mergeHeaders, serializeBody } from './utils';

const jsonHeaders = {
  'Content-Type': 'application/json',
};

/**
 * Create a Bearer authorization header with concatenated projectId and token
 * @param projectId The project id to use in the header
 * @param token Token to be concatenated. Defaults to empty.
 */
const createAuthorizationHeader = (
  projectId: string,
  token = '',
): Record<string, string> => {
  let bearer = projectId;
  if (token) {
    bearer = bearer + ':' + token;
  }
  return {
    Authorization: `Bearer ${bearer}`,
  };
};

declare const BUILD_VERSION: string;

/**
 * Create descope custom headers
 */
const createDescopeHeaders = (
  projectId: string,
  refreshCookieName?: string,
) => {
  const res = {
    'x-descope-sdk-session-id': getClientSessionId(),
    'x-descope-sdk-name': 'core-js',
    'x-descope-sdk-version': BUILD_VERSION,
    'x-descope-project-id': projectId,
  };

  if (refreshCookieName) {
    res['x-descope-refresh-cookie-name'] = refreshCookieName;
  }
  return res;
};

const isJson = (value?: string) => {
  try {
    value = JSON.parse(value);
  } catch (e) {
    return false;
  }

  return typeof value === 'object' && value !== null;
};

/** Add the ability to pass multiple hooks instead of one when creating an http client */
const withMultipleHooks =
  <T extends object>(createHttpClient: (config: CreateHttpClientConfig) => T) =>
  (
    config: Omit<CreateHttpClientConfig, 'hooks'> & { hooks?: MultipleHooks },
  ) => {
    const beforeRequest: BeforeRequest = (conf) => {
      // get the before hooks from the config while function is running
      // because the hooks might change after sdk creation
      const beforeRequestHooks = [].concat(config.hooks?.beforeRequest || []);
      return beforeRequestHooks?.reduce((acc, fn) => fn(acc), conf);
    };

    const afterRequest: AfterRequest = async (req, res) => {
      // get the after hooks from the config while function is running
      // because the hooks might change after sdk creation
      const afterRequestHooks = [].concat(config.hooks?.afterRequest || []);
      // do not remove this check - on old versions of react-native it is required
      if (afterRequestHooks.length == 0) return;
      const results = await Promise.allSettled(
        afterRequestHooks?.map((fn) => fn(req, res?.clone())),
      );
      // eslint-disable-next-line no-console
      results.forEach(
        (result) =>
          result.status === 'rejected' && config.logger?.error(result.reason),
      );
    };

    return createHttpClient({
      ...config,
      hooks: {
        beforeRequest,
        afterRequest,
        transformResponse: config.hooks?.transformResponse,
      },
    });
  };

/**
 * Create the HTTP client used to send HTTP requests to the Descope API
 *
 * @param CreateHttpClientConfig Configuration for the client
 */
const createHttpClient = ({
  baseUrl = DEFAULT_BASE_API_URL,
  projectId,
  baseConfig,
  refreshCookieName,
  logger,
  hooks,
  cookiePolicy,
  fetch,
}: CreateHttpClientConfig): HttpClient => {
  const fetchWithLogger = createFetchLogger(logger, fetch);

  const sendRequest = async (config: RequestConfig) => {
    const requestConfig = hooks?.beforeRequest
      ? hooks.beforeRequest(config)
      : config;

    const { path, body, headers, queryParams, method, token } = requestConfig;

    const serializedBody = serializeBody(body);
    const requestInit: RequestInit = {
      headers: mergeHeaders(
        createAuthorizationHeader(projectId, token),
        createDescopeHeaders(projectId, refreshCookieName),
        baseConfig?.baseHeaders || {},
        isJson(serializedBody) ? jsonHeaders : {}, // add json content headers if body is json
        headers,
      ),
      method,
      body: serializedBody,
    };

    // On edge runtimes like Cloudflare, the fetch implementation does not support credentials
    // so we allow the caller to omit by specifying null
    // See https://github.com/cloudflare/workerd/blob/main/src/workerd/api/http.h#L591
    if (cookiePolicy !== null) {
      requestInit.credentials = cookiePolicy || 'include';
    }

    const res = await fetchWithLogger(
      urlBuilder({ path, baseUrl, queryParams, projectId }),
      requestInit,
    );

    if (hooks?.afterRequest) {
      await hooks.afterRequest(config, res?.clone());
    }

    if (hooks?.transformResponse) {
      const json = await res.json();
      const cookies = transformSetCookie(res.headers?.get('set-cookie') || '');
      const mutableResponse = {
        ...res,
        json: () => Promise.resolve(json),
        cookies,
      };
      // we want to make sure cloning the response will keep the transformed json data
      mutableResponse.clone = () => mutableResponse;
      return hooks.transformResponse(mutableResponse);
    }

    return res;
  };

  return {
    get: (path: string, { headers, queryParams, token } = {}) =>
      sendRequest({
        path,
        headers,
        queryParams,
        body: undefined,
        method: HTTPMethods.get,
        token,
      }),
    post: (path, body, { headers, queryParams, token } = {}) =>
      sendRequest({
        path,
        headers,
        queryParams,
        body,
        method: HTTPMethods.post,
        token,
      }),
    patch: (path, body, { headers, queryParams, token } = {}) =>
      sendRequest({
        path,
        headers,
        queryParams,
        body,
        method: HTTPMethods.patch,
        token,
      }),
    put: (path, body, { headers, queryParams, token } = {}) =>
      sendRequest({
        path,
        headers,
        queryParams,
        body,
        method: HTTPMethods.put,
        token,
      }),
    delete: (path, { headers, queryParams, token } = {}) =>
      sendRequest({
        path,
        headers,
        queryParams,
        body: undefined,
        method: HTTPMethods.delete,
        token,
      }),
    hooks,
    buildUrl: (path, queryParams) => {
      return urlBuilder({ projectId, baseUrl, path, queryParams });
    },
  };
};

export default withMultipleHooks((config) => createHttpClient(config));
export type { HttpClient };
