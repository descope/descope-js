import type { CSPDirectives, DescopeURLs } from './types';

const DEFAULT_DESCOPE_URLS: Required<DescopeURLs> = {
  api: 'api.descope.com',
  cdn: 'descopecdn.com',
  static: 'static.descope.com',
  images: 'imgs.descope.com',
};

export const getDescopeDefaults = (
  urls?: DescopeURLs,
  nonce?: string,
): CSPDirectives => {
  const resolvedUrls: Required<DescopeURLs> = {
    api: urls?.api ?? DEFAULT_DESCOPE_URLS.api,
    cdn: urls?.cdn ?? DEFAULT_DESCOPE_URLS.cdn,
    static: urls?.static ?? DEFAULT_DESCOPE_URLS.static,
    images: urls?.images ?? DEFAULT_DESCOPE_URLS.images,
  };

  const ensureHttps = (domain: string): string => {
    if (domain.startsWith('http://') || domain.startsWith('https://')) {
      return domain;
    }
    return `https://${domain}`;
  };

  const directives: CSPDirectives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      ensureHttps(resolvedUrls.static),
      ensureHttps(resolvedUrls.cdn),
    ],
    'style-src': ["'self'", ensureHttps(resolvedUrls.static)],
    'img-src': [
      "'self'",
      ensureHttps(resolvedUrls.static),
      ensureHttps(resolvedUrls.images),
      'data:',
    ],
    'font-src': ["'self'", ensureHttps(resolvedUrls.cdn)],
    'connect-src': [
      "'self'",
      ensureHttps(resolvedUrls.static),
      ensureHttps(resolvedUrls.api),
    ],
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'frame-src': ["'self'"],
    'worker-src': ["'self'"],
    'manifest-src': ["'self'"],
    'form-action': ["'self'"],
  };

  if (nonce) {
    directives['script-src']!.push(`'nonce-${nonce}'`);
    directives['style-src']!.push(`'nonce-${nonce}'`);
  }

  return directives;
};
