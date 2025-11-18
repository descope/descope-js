import { ILogger } from '@descope/web-component';
import { CookieConfig, OidcConfig } from '@descope/web-js-sdk';
import type { CustomStorage } from '@descope/web-component';
export class DescopeAuthConfig {
  projectId = '';
  baseUrl?: string;
  baseStaticUrl?: string;
  baseCdnUrl?: string;
  // Default is true. If true, tokens will be stored on local storage.
  persistTokens?: boolean;
  // Default is true. If true, the SDK will automatically refresh the session token when it is about to expire
  autoRefresh?: boolean;
  sessionTokenViaCookie?: CookieConfig;
  // If truthy the SDK refresh and logout functions will use the OIDC client
  // Accepts boolean or OIDC configuration
  oidcConfig?: OidcConfig;
  // Default is true. If true, last authenticated user will be stored on local storage and can accessed with getUser function
  storeLastAuthenticatedUser?: boolean;
  pathsToIntercept?: string[];
  // Custom storage configuration for tokens and user data
  customStorage?: CustomStorage;
}

export type { ILogger };
