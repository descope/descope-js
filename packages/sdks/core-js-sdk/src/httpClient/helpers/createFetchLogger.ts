import { Logger } from '../../sdk/types';
import { Fetch } from '../types';

const REDACTED = '[REDACTED]';
const sensitiveHeader =
  /^(authorization|cookie|set-cookie|x-descope-.*-token)$/i;
const sensitiveBodyKey =
  /jwts?$|token|secret|cleartext|password|key|authorization|cookie|^code$/i;
const sensitiveQueryKey = /^(t|token|code)$/i;
const jwtValue = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

const redactJson = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(redactJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        sensitiveBodyKey.test(key) ? REDACTED : redactJson(entry),
      ]),
    );
  }
  if (typeof value === 'string') {
    try {
      return redactJson(JSON.parse(value));
    } catch {
      return value;
    }
  }
  return value;
};

const redactBody = (body: string): string | undefined => {
  if (!body) return undefined;
  try {
    const parsed = JSON.parse(body);
    if (typeof parsed === 'string') {
      const nested = JSON.parse(parsed);
      if (!nested || typeof nested !== 'object') return undefined;
    } else if (!parsed || typeof parsed !== 'object') {
      return undefined;
    }
    return JSON.stringify(redactJson(parsed));
  } catch {
    return undefined;
  }
};

const redactUrl = (url: URL | string): string => {
  try {
    const parsed = new URL(url.toString());
    if (parsed.username) parsed.username = REDACTED;
    if (parsed.password) parsed.password = REDACTED;
    parsed.hash = '';
    parsed.searchParams.forEach((value, key) => {
      if (sensitiveQueryKey.test(key) || jwtValue.test(value)) {
        parsed.searchParams.set(key, REDACTED);
      }
    });
    return parsed.toString();
  } catch {
    return '[INVALID URL]';
  }
};

/** Build a log message around HTTP calls  */
const httpLogBuilder = () => {
  const msg: {
    Title?: string;
    Url?: string;
    Method?: string;
    Headers?: string;
    Body?: string;
    Status?: string;
    Retries?: number;
  } = {};

  return {
    headers(headers: HeadersInit) {
      const safeHeaders = Array.from(new Headers(headers).entries()).map(
        ([key, value]) => [key, sensitiveHeader.test(key) ? REDACTED : value],
      );
      msg.Headers = JSON.stringify(Object.fromEntries(safeHeaders));

      return this;
    },

    body(body: string) {
      msg.Body = redactBody(body);
      return this;
    },

    url(url: URL | string) {
      msg.Url = redactUrl(url);
      return this;
    },

    method(method: string) {
      msg.Method = method;
      return this;
    },

    title(title: string) {
      msg.Title = title;
      return this;
    },

    status(status: string) {
      msg.Status = status;
      return this;
    },

    retries(retries: number) {
      msg.Retries = retries;
      return this;
    },

    build() {
      return Object.keys(msg)
        .flatMap((key) =>
          msg[key] ? [`${key !== 'Title' ? `${key}: ` : ''}${msg[key]}`] : [],
        )
        .join('\n');
    },
  };
};

/** Log the request object */
const buildRequestLog = (args: Parameters<Fetch>) =>
  httpLogBuilder()
    .title('Request')
    .url(args[0])
    .method(args[1].method)
    .headers(args[1].headers)
    .body(args[1].body)
    .build();

// we should retry on these status codes:
// 503: Service Unavailable
// 520: Web Server Returned an Unknown Error (Cloudflare error)
// 521: Web Server Is Down (Cloudflare error)
// 522: Connection Timed Out (Cloudflare error)
// 524: A Timeout Occurred (Cloudflare error)
// 530: Cloudflare error
const retryStatusCodes = [503, 520, 521, 522, 524, 530];

// Retry delays in ms: first retry after 100ms, subsequent retries after 5000ms
const retryDelaysMs = [100, 5000, 5000];

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// sendRequest sets this on the init when a caller passes disableRetry. fetch
// ignores properties it does not know, so it never reaches the network.
const isRetryDisabled = (init: Parameters<Fetch>[1]) =>
  !!(init as { disableRetry?: boolean })?.disableRetry;

/** Log the response object */
const buildResponseLog = async (resp: Response & { retries?: number }) => {
  const respBody = await resp.text();

  return httpLogBuilder()
    .title('Response')
    .url(resp.url.toString())
    .status(`${resp.status} ${resp.statusText}`)
    .headers(resp.headers)
    .body(respBody)
    .retries(resp.retries)
    .build();
};

const fetchWrapper = (fetch: Fetch) =>
  // Named function rather than an `async (...rest) =>` arrow: Metro/Hermes
  // (RN 0.85+) mis-compiles that construct when bundling — facebook/metro#1725.
  async function fetchWithRetries(...args: Parameters<Fetch>) {
    let resp: Response & { retries?: number } = await fetch(...args);

    const retryDisabled = isRetryDisabled(args[1]);
    let retries = 0;
    while (
      !retryDisabled &&
      retryStatusCodes.includes(resp.status) &&
      retries < retryDelaysMs.length
    ) {
      await sleep(retryDelaysMs[retries]);
      resp = await fetch(...args);
      retries++;
    }

    if (retries > 0) {
      resp.retries = retries;
    }

    // we found out that cloning the response is problematic when using node fetch
    // so instead, we are reading the body stream once and overriding the clone, text & json functions
    const respText = await resp.text();

    resp.text = () => Promise.resolve(respText);
    resp.json = () => Promise.resolve(JSON.parse(respText));
    resp.clone = () => resp;

    return resp;
  };

/**
 * Create a fetch with a logger wrapped around it if a logger is given
 * @param logger Logger to send the logs to
 * @param receivedFetch Fetch to be used or built-in fetch if not provided
 *
 */
const createFetchLogger = (logger: Logger, receivedFetch?: Fetch) => {
  const baseFetch = receivedFetch || fetch;
  if (!baseFetch)
    // eslint-disable-next-line no-console
    logger?.warn(
      'Fetch is not defined, you will not be able to send http requests, if you are running in a test, make sure fetch is defined globally',
    );

  if (!logger) return fetchWrapper(baseFetch);
  // Named function rather than an `async (...rest) =>` arrow — see fetchWrapper above.
  return async function loggingFetch(...args: Parameters<Fetch>) {
    if (!baseFetch)
      throw Error(
        'Cannot send http request, fetch is not defined, if you are running in a test, make sure fetch is defined globally',
      );
    logger.log(buildRequestLog(args));
    const resp = await fetchWrapper(baseFetch)(...args);

    logger[resp.ok ? 'log' : 'error'](await buildResponseLog(resp));

    return resp;
  };
};

export default createFetchLogger;
