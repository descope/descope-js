import createWebSdk from '@descope/web-js-sdk';

export type Sdk = ReturnType<typeof createWebSdk>;

type CustomAttributeType = string | boolean | number;

type CustomAttributes = Record<string, CustomAttributeType>;

type UserStatus = 'enabled' | 'disabled' | 'invited';

type Tenant = AssociatedTenant & {
  tenantName: string;
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

export type Role = {
  name: string;
  description: string;
  permissionNames: string[];
  createdTime: Date;
  tenantId: string;
};

export type SortParams = { field: string; desc: boolean };

export type SearchUsersConfig = {
  page?: number;
  limit?: number;
  customAttributes?: CustomAttributes;
  statuses?: UserStatus;
  emails?: string[];
  phones?: string[];
  text?: string;
  sort?: SortParams[];
};

export type UpdateUserConfig = {
  loginId?: string;
  email?: string;
  phone?: string;
  displayName?: string;
  roles?: string[];
  customAttributes?: CustomAttributes;
  picture?: string;
  verifiedEmail?: boolean;
  verifiedPhone?: boolean;
  givenName?: string;
  middleName?: string;
  familyName?: string;
  additionalLoginIds?: string[];
  userTenants?: AssociatedTenant[];
};

export type CreateUserConfig = {
  inviteUrl?: string;
  sendMail?: boolean; // send invite via mail, default is according to project settings
  sendSMS?: boolean; // send invite via text message, default is according to project settings
  invite?: boolean;
} & UpdateUserConfig;
