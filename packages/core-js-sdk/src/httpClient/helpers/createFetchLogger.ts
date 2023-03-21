import { Logger } from '../../sdk/types';
import { Fetch } from '../types';

/** Build a log message around HTTP calls  */
const httpLogBuilder = () => {
  const msg: {
    Title?: string;
    Url?: string;
    Method?: string;
    Headers?: string;
    Body?: string;
    Status?: string;
  } = {};

  return {
    headers(headers: HeadersInit) {
      const headersObj =
        typeof headers.entries === 'function'
          ? Object.fromEntries(headers.entries())
          : headers;
      msg.Headers = JSON.stringify(headersObj);

      return this;
    },

    body(body: string) {
      msg.Body = body;
      return this;
    },

    url(url: URL | string) {
      msg.Url = url.toString();
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

    build() {
      return Object.keys(msg)
        .flatMap((key) =>
          msg[key] ? [`${key !== 'Title' ? `${key}: ` : ''}${msg[key]}`] : []
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

/** Log the response object */
const buildResponseLog = async (resp: Response) => {
  const respBody = await (resp.clone ? resp.clone().text() : resp.text());
  // eslint-disable-next-line no-param-reassign
  resp.text = () => Promise.resolve(respBody);
  // eslint-disable-next-line no-param-reassign
  resp.json = () => Promise.resolve(JSON.parse(respBody));

  return httpLogBuilder()
    .title('Response')
    .url(resp.url.toString())
    .status(`${resp.status} ${resp.statusText}`)
    .headers(resp.headers)
    .body(respBody)
    .build();
};

/**
 * Create a fetch with a logger wrapped around it if a logger is given
 * @param logger Logger to send the logs to
 * @param receivedFetch Fetch to be used or built-in fetch if not provided
 *
 */
const createFetchLogger = (logger: Logger, receivedFetch?: Fetch) => {
  const fetchInternal = receivedFetch || fetch;
  if (!fetchInternal)
    // eslint-disable-next-line no-console
    logger?.warn(
      'Fetch is not defined, you will not be able to send http requests, if you are running in a test, make sure fetch is defined globally'
    );

  if (!logger) return fetchInternal;
  return async (...args: Parameters<Fetch>) => {
    if (!fetchInternal)
      throw Error(
        'Cannot send http request, fetch is not defined, if you are running in a test, make sure fetch is defined globally'
      );
    logger.log(buildRequestLog(args));
    const resp = await fetchInternal(...args);
    logger[resp.ok ? 'log' : 'error'](await buildResponseLog(resp));

    return resp;
  };
};

export default createFetchLogger;
