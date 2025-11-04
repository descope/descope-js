import AccessKeyManagementWidget from '@descope/access-key-management-widget';
import ApplicationsPortalWidget from '@descope/applications-portal-widget';
import AuditManagementWidget from '@descope/audit-management-widget';
import RoleManagementWidget from '@descope/role-management-widget';
import TenantProfileWidget from '@descope/tenant-profile-widget';
import UserManagementWidget from '@descope/user-management-widget';
import UserProfileWidget from '@descope/user-profile-widget';
import OutboundApplicationsWidget from '@descope/outbound-applications-widget';
import type {
  AutoFocusOptions,
  CustomStorage,
  FlowJWTResponse,
  ILogger,
  ThemeOptions,
} from '@descope/web-component';
import DescopeWc from '@descope/web-component';
import type { UserResponse } from '@descope/web-js-sdk';
import React, { DOMAttributes } from 'react';
import createSdk from './sdk';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ['descope-wc']: DescopeCustomElement;
      ['descope-user-management-widget']: UserManagementCustomElement;
      ['descope-role-management-widget']: RoleManagementCustomElement;
      ['descope-access-key-management-widget']: AccessKeyManagementCustomElement;
      ['descope-audit-management-widget']: AuditManagementCustomElement;
      ['descope-user-profile-widget']: UserProfileCustomElement;
      ['descope-applications-portal-widget']: ApplicationsPortalCustomElement;
      ['descope-tenant-profile-widget']: TenantProfileCustomElement;
      ['descope-outbound-applications-widget']: OutboundApplicationsCustomElement;
    }
  }
}

type WidgetProps = {
  logger?: ILogger;
  tenant: string;
  widgetId: string;
  // If theme is not provided - the OS theme will be used
  theme?: ThemeOptions;
  debug?: boolean;
  styleId?: string;
  onReady?: CustomEventCb<{}>;
};

type FlowResponse = Awaited<ReturnType<Sdk['flow']['next']>>;

type ErrorResponse = Required<FlowResponse>['error'];

type JWTResponse = Required<Required<FlowResponse>['data']>['authInfo'];

type CustomEventCb<T extends Record<string, any>> = (e: CustomEvent<T>) => void;

export type User = UserResponse;

export type Sdk = ReturnType<typeof createSdk>;

export type CustomElement<T> = Partial<
  T &
    DOMAttributes<T> & {
      children: React.ReactNode;
      ref: React.Ref<HTMLElement>;
    }
>;

export type DescopeCustomElement = CustomElement<DescopeWc>;

export type UserManagementCustomElement = CustomElement<
  typeof UserManagementWidget & UserManagementProps
>;

export type RoleManagementCustomElement = CustomElement<
  typeof RoleManagementWidget & RoleManagementProps
>;

export type AccessKeyManagementCustomElement = CustomElement<
  typeof AccessKeyManagementWidget & AccessKeyManagementProps
>;

export type AuditManagementCustomElement = CustomElement<
  typeof AuditManagementWidget & AuditManagementProps
>;

export type UserProfileCustomElement = CustomElement<
  typeof UserProfileWidget & UserProfileProps
>;

export type ApplicationsPortalCustomElement = CustomElement<
  typeof ApplicationsPortalWidget & ApplicationsPortalProps
>;

export type TenantProfileCustomElement = CustomElement<
  typeof TenantProfileWidget & TenantProfileProps
>;

export type OutboundApplicationsCustomElement = CustomElement<
  typeof OutboundApplicationsWidget & OutboundApplicationsProps
>;

export interface IContext {
  fetchUser: () => void;
  user: User;
  isUserLoading: boolean;
  isUserFetched: boolean;
  fetchSession: () => void;
  session: string;
  isAuthenticated: boolean;
  isSessionLoading: boolean;
  isOidcLoading: boolean;
  isSessionFetched: boolean;
  projectId: string;
  baseUrl?: string;
  styleId?: string;
  baseStaticUrl?: string;
  baseCdnUrl?: string;
  storeLastAuthenticatedUser?: boolean;
  keepLastAuthenticatedUserAfterLogout?: boolean;
  refreshCookieName?: string;
  customStorage?: CustomStorage;
  claims?: JWTResponse['claims'];
  sdk?: Sdk;
  setUser: React.Dispatch<React.SetStateAction<User>>;
  setSession: React.Dispatch<React.SetStateAction<string>>;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
}

export type DescopeProps = {
  flowId: string;
  onSuccess?: CustomEventCb<FlowJWTResponse>;
  onError?: CustomEventCb<ErrorResponse>;
  onReady?: CustomEventCb<{}>;
  logger?: ILogger;
  tenant?: string;
  // If theme is not provided - the OS theme will be used
  theme?: ThemeOptions;
  // If locale is not provided - the browser's locale will be used
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
  // use to override screen's form inputs in flow execution
  form?: Record<string, any>;
  // use to override client context in flow execution
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
  children?: React.ReactNode;
  externalRequestId?: string;
};

export type UserManagementProps = WidgetProps;

export type RoleManagementProps = WidgetProps;

export type AccessKeyManagementProps = WidgetProps;

export type AuditManagementProps = WidgetProps;

export type UserProfileProps = Omit<WidgetProps, 'tenant'> & {
  onLogout?: (e: CustomEvent) => void;
};

export type ApplicationsPortalProps = Omit<WidgetProps, 'tenant'> & {
  onLogout?: (e: CustomEvent) => void;
};

export type TenantProfileProps = WidgetProps;

export type OutboundApplicationsProps = WidgetProps;

export type { ILogger };
export type DefaultFlowProps = Omit<DescopeProps, 'flowId'>;
