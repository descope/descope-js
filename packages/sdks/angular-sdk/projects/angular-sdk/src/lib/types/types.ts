import { ILogger } from '@descope/web-component';
import { CookieConfig } from '@descope/web-js-sdk';
export class DescopeAuthConfig {
  projectId = '';
  baseUrl?: string;
  baseStaticUrl?: string;
  baseCdnUrl?: string;
  // If true, tokens will be stored on local storage
  persistTokens?: boolean;
  sessionTokenViaCookie?: CookieConfig;
  // If true, last authenticated user will be stored on local storage and can accessed with getUser function
  storeLastAuthenticatedUser?: boolean;
  pathsToIntercept?: string[];
}

export type { ILogger };
