import type { WWWAuthenticateParams } from './types';

/**
 * Builds a WWW-Authenticate header value according to RFC 9728
 * @param params WWW-Authenticate parameters
 * @returns Formatted WWW-Authenticate header value
 */
export function buildWWWAuthenticate(params: WWWAuthenticateParams): string {
  const parts: string[] = ['Bearer'];

  if (params.realm) {
    parts.push(`realm="${escapeHeaderValue(params.realm)}"`);
  }

  if (params.scope) {
    parts.push(`scope="${escapeHeaderValue(params.scope)}"`);
  }

  if (params.error) {
    parts.push(`error="${params.error}"`);

    if (params.error_description) {
      parts.push(
        `error_description="${escapeHeaderValue(params.error_description)}"`,
      );
    }

    if (params.error_uri) {
      parts.push(`error_uri="${escapeHeaderValue(params.error_uri)}"`);
    }
  }

  if (params.authorizationServers?.length) {
    const asUris = params.authorizationServers
      .map((uri) => escapeHeaderValue(uri))
      .join(' ');
    parts.push(`as_uri="${asUris}"`);
  }

  if (params.resourceMetadataUrl) {
    parts.push(
      `resource_metadata="${escapeHeaderValue(params.resourceMetadataUrl)}"`,
    );
  }

  return parts.join(', ');
}

function escapeHeaderValue(value: string): string {
  return value.replace(/"/g, '\\"').replace(/\r?\n/g, ' ');
}

/**
 * Parses a WWW-Authenticate header value into structured parameters
 * @param header WWW-Authenticate header value to parse
 * @returns Parsed WWW-Authenticate parameters
 */
export function parseWWWAuthenticate(header: string): WWWAuthenticateParams {
  const params: WWWAuthenticateParams = {};
  const regex = /(\w+)="([^"]+)"/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(header)) !== null) {
    const [, key, value] = match;

    switch (key) {
      case 'realm':
        params.realm = unescapeHeaderValue(value);
        break;
      case 'scope':
        params.scope = unescapeHeaderValue(value);
        break;
      case 'error':
        params.error = value as any;
        break;
      case 'error_description':
        params.error_description = unescapeHeaderValue(value);
        break;
      case 'error_uri':
        params.error_uri = unescapeHeaderValue(value);
        break;
      case 'as_uri':
        params.authorizationServers = unescapeHeaderValue(value).split(' ');
        break;
      case 'resource_metadata':
        params.resourceMetadataUrl = unescapeHeaderValue(value);
        break;
    }
  }

  return params;
}

function unescapeHeaderValue(value: string): string {
  return value.replace(/\\"/g, '"');
}
