import type { HeadersMap } from './types';

export const DEFAULT_MAX_HEADER_LENGTH = 2048; // 2KB per header value safeguard

/**
 * Normalizes filter input to an array of RegExp or undefined
 */
export function normalizeFilters(
  filter?: RegExp | RegExp[],
): RegExp[] | undefined {
  if (!filter) return undefined;
  return Array.isArray(filter) ? filter : [filter];
}

/**
 * Type guard to check if input is a Request object
 */
export function isRequest(input: RequestInfo | URL): input is Request {
  return typeof Request !== 'undefined' && input instanceof Request;
}

/**
 * Converts various header formats to a normalized HeadersMap
 */
export function toHeadersMap(
  headers?: Headers | HeadersInit,
  truncate?: (value: string) => string,
): HeadersMap {
  const result: HeadersMap = {};
  if (!headers) {
    return result;
  }

  const applyPair = (key: string, value: string) => {
    const normalizedKey = key.toLowerCase();
    const normalizedValue = truncate ? truncate(value) : value;
    result[normalizedKey] = normalizedValue;
  };

  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    headers.forEach((value, key) => applyPair(key, value));
    return result;
  }

  if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => applyPair(key, value));
    return result;
  }

  Object.entries(headers).forEach(([key, value]) =>
    applyPair(key, String(value)),
  );
  return result;
}

/**
 * Parses raw HTTP header string into a HeadersMap
 */
export function parseResponseHeaders(
  rawHeaders: string,
  truncate: (value: string) => string,
): HeadersMap {
  const headers: HeadersMap = {};
  if (!rawHeaders) return headers;

  rawHeaders
    .trim()
    .split(/\r?\n/)
    .forEach((line) => {
      const separatorIndex = line.indexOf(':');
      if (separatorIndex === -1) return;
      const key = line.slice(0, separatorIndex).trim().toLowerCase();
      const value = line.slice(separatorIndex + 1).trim();
      headers[key] = truncate(value);
    });

  return headers;
}

/**
 * Truncates a header value to a maximum length
 */
export function truncateHeader(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return value.substring(0, maxLength - 20) + '... [truncated]';
}

/**
 * Normalizes a URL string to an absolute URL
 */
export function normalizeUrl(url: string): string {
  if (!url) return url;
  try {
    return new URL(url, window.location.href).toString();
  } catch {
    return url;
  }
}

/**
 * Tests if a URL matches any of the provided filters
 */
export function shouldCaptureUrl(url: string, urlFilters?: RegExp[]): boolean {
  if (!url) return false;
  if (!urlFilters || urlFilters.length === 0) {
    return true;
  }
  return urlFilters.some((filter) => {
    try {
      return filter.test(url);
    } catch (error) {
      console.debug('Network plugin filter failed:', error);
      return false;
    }
  });
}

/**
 * Extracts HTTP method from fetch input
 */
export function extractMethod(
  input: RequestInfo | URL,
  init?: RequestInit,
): string {
  if (init?.method) {
    return init.method.toUpperCase();
  }

  if (isRequest(input) && input.method) {
    return input.method.toUpperCase();
  }

  return 'GET';
}

/**
 * Extracts URL string from fetch input
 */
export function extractUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  if (isRequest(input)) {
    return input.url;
  }

  return String(input);
}

/**
 * Extracts and normalizes request headers from fetch input
 */
export function extractRequestHeaders(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  truncate: (value: string) => string,
): HeadersMap {
  const headers: HeadersMap = {};

  if (isRequest(input)) {
    Object.assign(headers, toHeadersMap(input.headers, truncate));
  }

  if (init?.headers) {
    Object.assign(headers, toHeadersMap(init.headers, truncate));
  }

  return headers;
}

/**
 * Extracts and normalizes response headers
 */
export function extractResponseHeaders(
  response: Response,
  truncate: (value: string) => string,
): HeadersMap {
  if (!response.headers) return {};
  return toHeadersMap(response.headers, truncate);
}

/**
 * Safely logs debug messages with error handling
 */
export function safeDebugLog(message: string, error: unknown): void {
  console.debug(message, error);
}

/**
 * Calculates duration from start time
 */
export function calculateDuration(startTime: number): number {
  return Date.now() - startTime;
}
