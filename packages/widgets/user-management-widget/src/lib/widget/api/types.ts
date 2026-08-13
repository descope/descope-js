import type { FilterColumn } from '@descope/sdk-component-drivers';
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
  recoveryEmail: string;
  recoveryPhone: string;
  verifiedEmail: boolean;
  verifiedPhone: boolean;
  verifiedRecoveryEmail: boolean;
  verifiedRecoveryPhone: boolean;
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

// Re-exported from the driver (identical shape) so the widget's rows and the
// FilterDriver's cannot drift apart.
export type { FilterRow } from '@descope/sdk-component-drivers';

// How a column's rows map to request fields. Set at widget-design time and baked
// into the published data, so the SDK stays a generic interpreter with no
// backend field names. Unknown kinds are skipped.
export type FieldMapping =
  | { kind: 'array'; field: string; valueMap?: Record<string, string> }
  | { kind: 'boolean'; field: string }
  // text: two backend fields, because the search API matches two ways.
  //   exactField - the top-level array field for an `equal` row (exact match),
  //     e.g. `emails`, `loginIds`, `phones`.
  //   likeField  - the searchFields column for substring rows (contains /
  //     starts-with / ends-with / not-*), sent as a `%value%` LIKE query,
  //     e.g. `email`, `displayname`, `name`.
  // A column needs whichever field its operators use; a row whose operator has
  // no matching field is dropped (see mapTextRow).
  | { kind: 'text'; exactField?: string; likeField?: string }
  | { kind: 'customAttribute'; name: string };

// The published column shape the widget consumes: the driver's FilterColumn
// plus the field mapping baked into its data.
export type FilterableColumn = FilterColumn & { mapping?: FieldMapping };

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
  recoveryEmail?: string;
  recoveryPhone?: string;
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
  // Select-type attributes carry their choices as {value,label} objects
  // (matches the mgmt customattributes API); other types have an empty array.
  options: { value: string; label: string }[];
  displayName: string;
  defaultValue: Record<string, string>;
  ViewPermissions: string[];
  EditPermissions: string[];
  editable: boolean;
};
