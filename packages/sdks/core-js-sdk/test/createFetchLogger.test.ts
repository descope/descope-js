/** @jest-environment node */
import createFetchLogger from '../src/httpClient/helpers/createFetchLogger';

const createLogger = () => ({
  log: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
});

it('redacts request and response secrets without changing the fetch exchange', async () => {
  const logger = createLogger();
  const requestBody = JSON.stringify({
    password: 'password-value',
    nested: [{ sessionJwt: 'session-value', errorCode: 'E123' }],
    config: JSON.stringify({ cleartext: 'secret-value', code: 'otp-value' }),
  });
  const responseBody = JSON.stringify({
    refreshJwt: 'refresh-value',
    accessToken: 'access-value',
    apiKey: 'key-value',
    statusCode: 200,
  });
  const headers = new Headers({
    Authorization: 'Bearer project:management-key',
    Cookie: 'DS=session; DSR=refresh',
    'X-Descope-Refresh-Token': 'header-token',
    'X-Descope-Project-Id': 'project',
  });
  const response = new Response(responseBody, {
    status: 200,
    headers: { 'Set-Cookie': 'DS=session', 'Content-Type': 'application/json' },
  });
  Object.defineProperty(response, 'url', {
    value: 'https://api.descope.com/auth?code=oauth-value&safe=yes',
  });
  const fetch = jest.fn().mockResolvedValue(response);
  const loggedFetch = createFetchLogger(logger, fetch);
  const url =
    'https://api.descope.com/auth?t=token-value&token=another-value&jwt=aaa.bbb.ccc&safe=yes#fragment';

  const result = await loggedFetch(url, {
    method: 'POST',
    headers,
    body: requestBody,
  });

  expect(fetch).toHaveBeenCalledWith(url, {
    method: 'POST',
    headers,
    body: requestBody,
  });
  expect(await result.text()).toBe(responseBody);
  expect(await result.json()).toEqual(JSON.parse(responseBody));
  expect(logger.log).toHaveBeenCalledTimes(2);
  const requestLog = logger.log.mock.calls[0][0];
  const responseLog = logger.log.mock.calls[1][0];
  expect(requestLog).toContain('safe=yes');
  expect(requestLog).toContain('t=%5BREDACTED%5D');
  expect(requestLog).toContain('token=%5BREDACTED%5D');
  expect(requestLog).toContain('jwt=%5BREDACTED%5D');
  expect(requestLog).toContain('"authorization":"[REDACTED]"');
  expect(requestLog).toContain('"cookie":"[REDACTED]"');
  expect(requestLog).toContain('"x-descope-refresh-token":"[REDACTED]"');
  expect(requestLog).toContain('"x-descope-project-id":"project"');
  expect(requestLog).toContain(
    '"config":{"cleartext":"[REDACTED]","code":"[REDACTED]"}',
  );
  expect(responseLog).toContain('code=%5BREDACTED%5D');
  expect(responseLog).toContain('"set-cookie":"[REDACTED]"');
  expect(responseLog).toContain('"statusCode":200');
  for (const log of [requestLog, responseLog]) {
    expect(log).not.toMatch(
      /management-key|session-value|refresh-value|access-value|key-value|password-value|secret-value|otp-value|oauth-value|token-value|another-value|aaa\.bbb\.ccc|#fragment/,
    );
  }
});

it('redacts JSON encoded inside a top-level string and tuple headers', async () => {
  const logger = createLogger();
  const body = JSON.stringify(
    JSON.stringify({
      user: { password: 'nested-password', errorCode: 'E123' },
    }),
  );
  const response = new Response(body);
  Object.defineProperty(response, 'url', { value: 'https://api.descope.com/' });
  const loggedFetch = createFetchLogger(
    logger,
    jest.fn().mockResolvedValue(response),
  );

  await loggedFetch('https://api.descope.com/', {
    method: 'POST',
    headers: [
      ['AUTHORIZATION', 'Bearer nested-key'],
      ['X-Descope-Session-Token', 'nested-token'],
    ],
    body,
  });

  for (const log of logger.log.mock.calls.map(([message]) => message)) {
    expect(log).toContain('"password":"[REDACTED]"');
    expect(log).toContain('"errorCode":"E123"');
    expect(log).not.toMatch(/nested-password|nested-key|nested-token/);
  }
});

it('omits unparseable request and response bodies', async () => {
  const logger = createLogger();
  const response = new Response('secret=unparseable-response', { status: 400 });
  Object.defineProperty(response, 'url', { value: 'https://api.descope.com/' });
  const loggedFetch = createFetchLogger(
    logger,
    jest.fn().mockResolvedValue(response),
  );

  await loggedFetch('https://api.descope.com/', {
    method: 'POST',
    headers: new Headers(),
    body: 'secret=unparseable-request',
  });

  expect(logger.log.mock.calls[0][0]).toContain('Request');
  expect(logger.log.mock.calls[0][0]).not.toContain('unparseable-request');
  expect(logger.error.mock.calls[0][0]).toContain('Status: 400');
  expect(logger.error.mock.calls[0][0]).not.toContain('unparseable-response');
});
