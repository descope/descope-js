import type { CSPDirectives, DescopeURLs } from './types';

const DEFAULT_DESCOPE_URLS: Required<DescopeURLs> = {
  api: 'api.descope.com',
  cdn: 'descopecdn.com',
  static: 'static.descope.com',
  images: 'imgs.descope.com',
  content: 'content.app.descope.com',
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
    content: urls?.content ?? DEFAULT_DESCOPE_URLS.content,
  };

  const ensureHttps = (domain: string): string => {
    if (domain.startsWith('http://') || domain.startsWith('https://')) {
      return domain;
    }
    return `https://${domain}`;
  };

  const directives: CSPDirectives = {
    'script-src': [
      "'self'",
      ensureHttps(resolvedUrls.static),
      ensureHttps(resolvedUrls.cdn),
    ],
    'img-src': [
      ensureHttps(resolvedUrls.static),
      ensureHttps(resolvedUrls.content),
      ensureHttps(resolvedUrls.images),
      'data:',
    ],
    'connect-src': [
      "'self'",
      ensureHttps(resolvedUrls.static),
      ensureHttps(resolvedUrls.api),
    ],
  };

  if (nonce) {
    directives['script-src']!.push(`'nonce-${nonce}'`);
    if (!directives['style-src']) {
      directives['style-src'] = [];
    }
    directives['style-src']!.push(`'nonce-${nonce}'`);
  }

  return directives;
};
