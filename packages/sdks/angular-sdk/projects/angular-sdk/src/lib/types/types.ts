import { ILogger } from '@descope/web-component';
import { CookieConfig } from '@descope/web-js-sdk';
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
  // Default is true. If true, last authenticated user will be stored on local storage and can accessed with getUser function
  storeLastAuthenticatedUser?: boolean;
  pathsToIntercept?: string[];
  // Custom storage configuration for tokens and user data
  customStorage?: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
  };
}

export type { ILogger };
