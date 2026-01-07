import type { Accessor, JSX } from 'solid-js';
import type createSdk from '@descope/web-js-sdk';
import type { UserResponse } from '@descope/web-js-sdk';
import type { CookieConfig, OidcConfig } from '@descope/web-js-sdk';
import type { CustomStorage } from '@descope/web-component';
import type {
  AutoFocusOptions,
  FlowJWTResponse,
  ILogger,
  ThemeOptions,
} from '@descope/web-component';
import type { Claims } from '@descope/core-js-sdk';

export type Sdk = ReturnType<typeof createSdk>;

export type User = UserResponse;

export interface DescopeProviderProps {
  projectId: string;
  baseUrl?: string;
  baseStaticUrl?: string;
  baseCdnUrl?: string;
  persistTokens?: boolean;
  autoRefresh?: boolean;
  sessionTokenViaCookie?: CookieConfig;
  refreshTokenViaCookie?: CookieConfig;
  oidcConfig?: OidcConfig;
  storeLastAuthenticatedUser?: boolean;
  keepLastAuthenticatedUserAfterLogout?: boolean;
  refreshCookieName?: string;
  getExternalToken?: () => Promise<string>;
  customStorage?: CustomStorage;
  children?: JSX.Element;
}

export interface AuthContextValue {
  user: Accessor<User | undefined>;
  session: Accessor<string | undefined>;
  claims: Accessor<Claims | undefined>;
  isAuthenticated: Accessor<boolean>;
  isSessionLoading: Accessor<boolean>;
  isUserLoading: Accessor<boolean>;
  isOidcLoading: Accessor<boolean>;
  sdk: Sdk;
  fetchSession: () => void;
  fetchUser: () => void;
  projectId: string;
  baseUrl?: string;
  baseStaticUrl?: string;
  baseCdnUrl?: string;
  storeLastAuthenticatedUser?: boolean;
  keepLastAuthenticatedUserAfterLogout?: boolean;
  refreshCookieName?: string;
  customStorage?: CustomStorage;
}

export interface UseSessionReturn {
  sessionToken: Accessor<string | undefined>;
  claims: Accessor<Claims | undefined>;
  isAuthenticated: Accessor<boolean>;
  isSessionLoading: Accessor<boolean>;
}

export interface UseUserReturn {
  user: Accessor<User | undefined>;
  isUserLoading: Accessor<boolean>;
}

export interface DescopeProps {
  flowId: string;
  onSuccess?: (e: CustomEvent<FlowJWTResponse>) => void;
  onError?: (e: CustomEvent<any>) => void;
  onReady?: (e: CustomEvent<{}>) => void;
  logger?: ILogger;
  tenant?: string;
  theme?: ThemeOptions;
  locale?: string;
  nonce?: string;
  autoFocus?: AutoFocusOptions;
  validateOnBlur?: boolean;
  restartOnError?: boolean;
  debug?: boolean;
  telemetryKey?: string;
  redirectUrl?: string;
  outboundAppId?: string;
  outboundAppScopes?: string[];
  popupOrigin?: string;
  errorTransformer?: (error: { text: string; type: string }) => string;
  form?: Record<string, any>;
  client?: Record<string, any>;
  styleId?: string;
  dismissScreenErrorOnInput?: boolean;
  onScreenUpdate?: (
    screenName: string,
    context: Record<string, any>,
    next: (
      interactionId: string,
      form: Record<string, any>,
    ) => Promise<unknown>,
    ref: HTMLElement,
  ) => boolean | Promise<boolean>;
  children?: JSX.Element;
  externalRequestId?: string;
}

export interface WidgetProps {
  logger?: ILogger;
  tenant: string;
  widgetId: string;
  theme?: ThemeOptions;
  debug?: boolean;
  styleId?: string;
  onReady?: (e: CustomEvent<{}>) => void;
}

export interface UserProfileProps extends Omit<WidgetProps, 'tenant'> {
  onLogout?: (e: CustomEvent) => void;
}

export interface ApplicationsPortalProps extends Omit<WidgetProps, 'tenant'> {
  onLogout?: (e: CustomEvent) => void;
}

export type { ILogger, CustomStorage, CookieConfig, OidcConfig };
