import createWebSdk from '@descope/web-js-sdk';

export type Sdk = ReturnType<typeof createWebSdk>;

type CustomAttributeType = string | boolean | number;

type CustomAttributes = Record<string, CustomAttributeType>;

type UserStatus = 'enabled' | 'disabled' | 'invited';

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
};

export type TenantAdminLinkSSOResponse = {
  adminSSOConfigurationLink: string;
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
