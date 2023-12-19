import { Logger } from '../sdk/types';

/** Request configuration including headers, query params and token */
type HttpClientReqConfig = {
  headers?: HeadersInit;
  queryParams?: { [key: string]: string };
  token?: string;
};

/** HTTP methods we use in the client */
export enum HTTPMethods {
  get = 'GET',
  delete = 'DELETE',
  post = 'POST',
  put = 'PUT',
}

/** HTTP Client type that implements the HTTP method calls. Descopers can provide their own HTTP client although required only in rare cases. */
export type HttpClient = {
  get: (path: string, config?: HttpClientReqConfig) => Promise<Response>;
  post: (
    path: string,
    body?: any,
    config?: HttpClientReqConfig,
  ) => Promise<Response>;
  put: (
    path: string,
    body?: any,
    config?: HttpClientReqConfig,
  ) => Promise<Response>;
  delete: (path: string, config?: HttpClientReqConfig) => Promise<Response>;
  hooks?: Hooks;
};

export type Fetch = typeof fetch;

/** Parameters for the HTTP client. Defaults should work for most cases. */
export type CreateHttpClientConfig = {
  baseUrl: string;
  projectId: string;
  baseConfig?: { baseHeaders: HeadersInit };
  logger?: Logger;
  hooks?: Hooks;
  cookiePolicy?: RequestCredentials | null;
  fetch?: Fetch;
};

/** For before-request hook allows overriding parts of the request */
export type RequestConfig = {
  path: string;
  headers?: HeadersInit;
  queryParams?: { [key: string]: string };
  body?: any;
  method: HTTPMethods;
  token?: string;
};

export type BeforeRequest = (config: RequestConfig) => RequestConfig;
export type AfterRequest = (
  req: RequestConfig,
  res: Response,
) => void | Promise<void>;

/** Hooks before and after the request is made */
export type Hooks = {
  beforeRequest?: BeforeRequest;
  afterRequest?: AfterRequest;
};
