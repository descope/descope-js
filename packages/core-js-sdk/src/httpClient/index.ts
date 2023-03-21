import createFetchLogger from './helpers/createFetchLogger';
import {
  CreateHttpClientConfig,
  HttpClient,
  HTTPMethods,
  RequestConfig,
} from './types';
import { urlBuilder } from './urlBuilder';
import { mergeHeaders, serializeBody } from './utils';

/**
 * Create a Bearer authorization header with concatenated projectId and token
 * @param projectId The project id to use in the header
 * @param token Token to be concatenated. Defaults to empty.
 */
const createAuthorizationHeader = (projectId: string, token = '') => {
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
const createDescopeHeaders = () => {
  return {
    'x-descope-sdk-name': 'core-js',
    'x-descope-sdk-version': BUILD_VERSION,
  };
};

/**
 * Create the HTTP client used to send HTTP requests to the Descope API
 *
 * @param CreateHttpClientConfig Configuration for the client
 */
const createHttpClient = ({
  baseUrl,
  projectId,
  baseConfig,
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

    const res = await fetchWithLogger(
      urlBuilder({ path, baseUrl, queryParams }),
      {
        headers: mergeHeaders(
          createAuthorizationHeader(projectId, token),
          createDescopeHeaders(),
          baseConfig?.baseHeaders || {},
          headers
        ),
        method,
        body: serializeBody(body),
        credentials: cookiePolicy || 'include',
      }
    );

    if (hooks?.afterRequest) {
      await hooks.afterRequest(config, res?.clone());
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
    put: (path, body, { headers, queryParams, token } = {}) =>
      sendRequest({
        path,
        headers,
        queryParams,
        body,
        method: HTTPMethods.put,
        token,
      }),
    delete: (path, body, { headers, queryParams, token } = {}) =>
      sendRequest({
        path,
        headers,
        queryParams,
        body,
        method: HTTPMethods.delete,
        token,
      }),
    hooks,
  };
};

export default createHttpClient;
export type { HttpClient };
