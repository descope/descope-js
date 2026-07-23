import createWebSdk from '@descope/web-js-sdk';

export type Sdk = ReturnType<typeof createWebSdk>;

export type CustomAttributeType = string | boolean | number;

type CustomAttributes = Record<string, CustomAttributeType>;

export enum CustomAttributeTypeMap {
  text = 1,
  numeric = 2,
  bool = 3,
  singleSelect = 4,
  array = 5,
  date = 6,
}

type UserStatus = 'enabled' | 'disabled' | 'invited';

export type HttpClient = Sdk['httpClient'];

export type AssociatedTenant = {
  tenantId: string;
  tenantName?: string;
  roleNames: string[];
  permissions?: string[];
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
  userTenants: AssociatedTenant[];
  status: UserStatus;
  externalIds: string[];
  picture: string;
  test: boolean;
  editable: boolean;
  customAttributes: CustomAttributes;
  createdTime: number;
  createdTimeFormatted?: string;
  TOTP: boolean;
  SAML: boolean;
  OIDC: boolean;
  SCIM: boolean;
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

// Structured filter sent to /v1/mgmt/user/search `searchFields` (mirrors the
// BE common SearchField). `valStr` may carry `%` wildcards for LIKE; `negative`
// flips to NOT LIKE / != any. Honored only when the BE feature flag is on.
export type SearchField = {
  field: string;
  valStr?: string;
  valArr?: string[];
  negative?: boolean;
  valType?: string;
};

export type FilterRow = {
  column: string;
  operator: string;
  value: string | string[] | null;
  // Query affixes the widget resolves from the operator config (e.g. SQL-LIKE
  // `%`). The value stays raw; the consumer builds the query with these.
  prefix?: string;
  suffix?: string;
};

export type SearchUsersConfig = {
  page?: number;
  limit?: number;
  customAttributes?: CustomAttributes;
  statuses?: UserStatus[];
  roleNames?: string[];
  loginIds?: string[];
  emails?: string[];
  phones?: string[];
  text?: string;
  searchFields?: SearchField[];
  sort?: SortParams[];
  verifiedEmail?: boolean;
  verifiedPhone?: boolean;
  password?: boolean;
  totp?: boolean;
  webauthn?: boolean;
  scim?: boolean;
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

export type CustomAttr = {
  name: string;
  type: number;
  options: string[];
  displayName: string;
  defaultValue: Record<string, string>;
  ViewPermissions: string[];
  EditPermissions: string[];
  editable: boolean;
};
