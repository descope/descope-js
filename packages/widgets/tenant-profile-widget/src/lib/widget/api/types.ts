import createWebSdk from '@descope/web-js-sdk';

export type Sdk = ReturnType<typeof createWebSdk>;

type CustomAttributeType = string | boolean | number;

type CustomAttributes = Record<string, CustomAttributeType>;

type UserStatus = 'enabled' | 'disabled' | 'invited';

export type TenantSsoConfiguration = {
  ssoId: string;
  name: string;
  authType: string;
};

export type Tenant = AssociatedTenant & {
  id: string;
  name: string;
  selfProvisioningDomains: string[];
  customAttributes: CustomAttributes;
  authType: string;
  domains: string[];
  createdTime: number;
  disabled: boolean;
  enforceSSO: boolean;
  enforceSSOExclusions?: string[];
  additionalSSOConfigs?: TenantSsoConfiguration[];
};

export type TenantAdminLinkSSOResponse = {
  defaultLink: string;
  ssoIdToLink: Record<string, string>;
};

export type SsoConfiguration = {
  id: string;
  name: string;
  authType?: string;
  isDefault?: boolean;
  link?: string;
};

export type HttpClient = Sdk['httpClient'];

export type AssociatedTenant = {
  tenantId: string;
  roleNames: string[];
};

export type User = {
  loginIds: string[];
  userId: string;
  name: string;
  email: string;
  phone: string;
  verifiedEmail: boolean;
  verifiedPhone: boolean;
  roleNames: string[];
  userTenants: Tenant[];
  status: UserStatus;
  externalIds: string[];
  picture: string;
  test: boolean;
  editable: boolean;
  customAttributes: CustomAttributes;
  createdTime: number;
  TOTP: boolean;
  SAML: boolean;
  // OAuth: {},
  webauthn: boolean;
  password: boolean;
  // ssoAppIds: [],
  givenName: string;
  middleName: string;
  familyName: string;
};

export enum AttributeTypeName {
  TEXT = 'text',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  SINGLE_SELECT = 'singleSelect',
  ARRAY = 'array',
  DATE = 'date',
}
