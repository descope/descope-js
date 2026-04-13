/**
 * Split a combined Set-Cookie header string into individual cookie strings.
 *
 * Set-Cookie values are sometimes comma-joined into one string. This splits
 * them without choking on commas that appear inside a single cookie's
 * attributes (e.g. the Expires date "Sun, 10 May 2026 12:00:00 GMT").
 *
 * Based on https://github.com/nfriedly/set-cookie-parser (MIT).
 */
function splitCookiesString(cookiesString: string): string[] {
  if (!cookiesString) return [];

  const result: string[] = [];
  let pos = 0;

  function skipWhitespace() {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  }

  function notSpecialChar() {
    const ch = cookiesString.charAt(pos);
    return ch !== '=' && ch !== ';' && ch !== ',';
  }

  while (pos < cookiesString.length) {
    const start = pos;
    let cookiesSeparatorFound = false;
    let lastComma: number;
    let nextStart: number;

    while (skipWhitespace()) {
      const ch = cookiesString.charAt(pos);
      if (ch === ',') {
        // ',' is a cookie separator if we later find '=' before ';' or ','
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;

        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }

        if (pos < cookiesString.length && cookiesString.charAt(pos) === '=') {
          // found a cookie separator — the comma was between two cookies
          cookiesSeparatorFound = true;
          pos = nextStart;
          result.push(cookiesString.substring(start, lastComma));
          break;
        } else {
          // comma was inside an attribute value (e.g. Expires date)
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }

    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      result.push(cookiesString.substring(start, cookiesString.length));
    }
  }

  return result;
}

export function transformSetCookie(
  setCookieHeader: string,
): Record<string, string> {
  return Object.fromEntries(
    splitCookiesString(setCookieHeader)
      .map((cookieStr) => {
        const nameValue = cookieStr.split(';')[0];
        const eqIdx = nameValue.indexOf('=');
        if (eqIdx < 1) return null;
        return [
          nameValue.substring(0, eqIdx).trim(),
          nameValue.substring(eqIdx + 1).trim(),
        ];
      })
      .filter(Boolean),
  );
}

/* istanbul ignore next -- re-exports */
export { default as createFetchLogger } from './createFetchLogger';
/* istanbul ignore next -- re-exports */
export { getClientSessionId } from './getClientSessionId';
