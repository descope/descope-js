export { default as createFetchLogger } from './createFetchLogger';
export { getClientSessionId } from './getClientSessionId';

import setCookieParser from 'set-cookie-parser';

export function transformSetCookie(
  setCookieHeader: string,
): Record<string, string> {
  const cookies = setCookieParser.parse(
    setCookieParser.splitCookiesString(setCookieHeader),
  );
  return Object.fromEntries(cookies.map((c) => [c.name, c.value]));
}
