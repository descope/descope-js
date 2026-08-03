import { FilterColumn } from '@descope/sdk-component-drivers';
import { FilterRow, SearchUsersConfig } from '../api/types';

type Params = Partial<SearchUsersConfig>;

// Column-id prefix marking a custom-attribute filter row. Console-app emits
// `customAttributes.<attrName>` for opt-in CA cols; widget enriches them at
// runtime (see initFilterMixin). Values are routed verbatim into the BE
// `customAttributes` map keyed by attrName.
const CA_COL_PREFIX = 'customAttributes.';

// Multi-value columns map directly to native exact-match array fields.
const ARRAY_FIELDS: Record<string, keyof SearchUsersConfig> = {
  status: 'statuses',
  roles: 'roleNames',
};

// Boolean columns map directly to optional-bool proto fields. Only `equal`
// is exposed in the UI (per console-app metadata) — flipping the value
// covers the negation case.
// Console-app emits SCIM with uppercase id (matches grid col convention via
// USERS_FIELDS.scim = 'SCIM'). Wire field is lowercase per proto.
const BOOLEAN_FIELDS: Record<string, keyof SearchUsersConfig> = {
  verifiedEmail: 'verifiedEmail',
  verifiedPhone: 'verifiedPhone',
  password: 'password',
  totp: 'totp',
  webauthn: 'webauthn',
  SCIM: 'scim',
};

// Text columns whose `equal` operator maps to a native exact-match array field.
// Other operators (contains/starts-with/etc) fall back to the `text` full-text
// field, or to `searchFields` for the LIKE-able columns below.
const EXACT_FIELDS: Record<string, keyof SearchUsersConfig> = {
  loginIds: 'loginIds',
  email: 'emails',
  phone: 'phones',
};

const TEXT_COLUMNS = new Set([
  'loginIds',
  'name',
  'displayName',
  'givenName',
  'middleName',
  'familyName',
  'email',
  'phone',
]);

// Text columns whose fuzzy/negation operators route to the BE `searchFields`
// engine (wildcard LIKE / NOT LIKE). Keyed by widget column id → BE column key.
// Only columns the BE can LIKE are listed (name/givenName/middleName/familyName
// are a BE gap — not searchable, so their fuzzy ops stay unexposed). `equal`
// still uses the flat exact/text fields, so search keeps working when the BE
// searchFields flag is off; only these richer ops need searchFields.
const LIKE_FIELD_MAP: Record<string, string> = {
  loginIds: 'externalid',
  displayName: 'displayname',
  email: 'email',
  phone: 'phonenumber',
};

// Operators handled via searchFields. The value is already affixed with `%`
// by the widget per the operator's prefix/suffix config; the SDK forwards it
// verbatim. Console only exposes these ops once the BE flag is on — that
// column config is the effective rollout gate.
const SEARCH_FIELD_OPS = new Set([
  'contains',
  'not-contains',
  'starts-with',
  'ends-with',
  'not-equal',
]);

// Per-column value translation: UI/legacy values → wire values accepted by
// /v1/mgmt/user/search. Backend rejects unknown status strings — translate
// UI 'active' to wire 'enabled'.
const VALUE_TRANSLATIONS: Record<string, Record<string, string>> = {
  status: { active: 'enabled' },
};

// Fields the filter owns and clears each apply, so a removed row drops its
// value instead of being retained by the searchUsers thunk merge. `text` is
// deliberately excluded: it is co-owned by the standalone free-text search
// input (initFilterUsersInputMixin) which writes the same shared
// `searchParams.text`. Clearing it here would wipe the user's typed query on
// every filter apply — the filter still SETS text for full-text rows, but
// never clears the box's value.
const CLEARED_FIELDS: (keyof SearchUsersConfig)[] = [
  ...Object.values(ARRAY_FIELDS),
  ...Object.values(EXACT_FIELDS),
  ...Object.values(BOOLEAN_FIELDS),
  'searchFields',
  'customAttributes',
];

const firstValue = (v: FilterRow['value']): string | null => {
  const s = Array.isArray(v) ? v[0] : v;
  return s == null || s === '' ? null : String(s);
};

const toArray = (v: FilterRow['value']): string[] => {
  if (Array.isArray(v)) return v;
  return v == null || v === '' ? [] : [String(v)];
};

const translateValues = (column: string, values: string[]): string[] => {
  const map = VALUE_TRANSLATIONS[column];
  return map ? values.map((v) => map[v] ?? v) : values;
};

// Parse a CA row value per the column's declared `inputType`. WC always emits
// strings; BE jsonpath equality is type-strict (`@ == "true"` won't match a
// stored bool `true`). Returns `undefined` to signal "drop this row"
// (unparseable bool, NaN numeric, empty value).
const parseCaValue = (
  value: FilterRow['value'],
  inputType: FilterColumn['inputType'] | undefined,
): unknown => {
  if (Array.isArray(value)) return value.length ? value : undefined;
  if (value == null || value === '') return undefined;
  if (inputType === 'boolean') {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }
  if (inputType === 'number') {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return value;
};

// Each rule maps one column category to a params patch, or returns null if the
// row isn't its category (try the next rule). An empty patch `{}` means "this
// row is mine, but it contributes nothing" (e.g. dropped / empty value) and
// still stops the chain. Order matters: searchFields runs before the negation
// drop so NOT-LIKE ops reach the BE. Rules are pure — the caller owns mutation.
type RowRule = (row: FilterRow, cols?: FilterColumn[]) => Params | null;

// Fuzzy/negation ops on LIKE-able text columns → BE searchFields engine. The
// widget emits the raw value; we glue the operator's prefix/suffix affixes into
// the LIKE pattern here so they live only in the query, never in the input.
const applySearchField: RowRule = (row) => {
  if (!(LIKE_FIELD_MAP[row.column] && SEARCH_FIELD_OPS.has(row.operator))) {
    return null;
  }
  const v = firstValue(row.value);
  if (v === null) return {};
  return {
    searchFields: [
      {
        field: LIKE_FIELD_MAP[row.column],
        valStr: `${row.prefix ?? ''}${v}${row.suffix ?? ''}`,
        ...(row.operator.startsWith('not-') ? { negative: true } : {}),
      },
    ],
  };
};

// Any remaining negation op is unsupported on the flat path — drop the row.
const dropUnsupportedNegation: RowRule = (row) =>
  row.operator.startsWith('not-') ? {} : null;

const applyCustomAttribute: RowRule = (row, cols) => {
  if (!row.column.startsWith(CA_COL_PREFIX)) return null;
  const name = row.column.slice(CA_COL_PREFIX.length);
  if (!name) return {};
  // `is-empty`: BE matches users with no/null/default value when value === null
  // (gated server-side by feature flag UserSearchEmptyCustomAttr).
  if (row.operator === 'is-empty') {
    return { customAttributes: { [name]: null } as any };
  }
  const col = cols?.find((c) => c.id === row.column);
  const value = parseCaValue(row.value, col?.inputType);
  return value === undefined
    ? {}
    : { customAttributes: { [name]: value } as any };
};

const applyBoolean: RowRule = (row) => {
  const field = BOOLEAN_FIELDS[row.column];
  if (!field || row.operator !== 'equal') return null;
  const v = firstValue(row.value);
  if (v === 'true') return { [field]: true } as Params;
  if (v === 'false') return { [field]: false } as Params;
  return {};
};

const applyArray: RowRule = (row) => {
  const field = ARRAY_FIELDS[row.column];
  if (!field) return null;
  const arr = toArray(row.value);
  return arr.length
    ? ({ [field]: translateValues(row.column, arr) } as Params)
    : {};
};

const applyText: RowRule = (row) => {
  if (!TEXT_COLUMNS.has(row.column)) return null;
  const arr = toArray(row.value);
  if (!arr.length) return {};
  if (row.operator === 'equal' && EXACT_FIELDS[row.column]) {
    return { [EXACT_FIELDS[row.column]]: arr } as Params;
  }
  // contains / starts-with / ends-with → full-text. Last text row wins
  // (proto exposes a single `text` string).
  return { text: arr[0] };
};

const ROW_RULES: RowRule[] = [
  applySearchField,
  dropUnsupportedNegation,
  applyCustomAttribute,
  applyBoolean,
  applyArray,
  applyText,
];

// Translate descope-filter `filter-apply` event rows into native
// SearchUsersRequest fields. `cols` is the live filter column schema
// (`this.filter.data`), used to parse CA bool/numeric strings into JS
// bool/number for BE jsonpath equality — optional; absent → values pass
// through as strings (back-compat). Negation is unsupported by the endpoint
// (except NOT-LIKE via searchFields) and dropped; restrict via the column
// `operators` allowlist in console-app metadata.
export const filterToSearchParams = (
  rows: FilterRow[],
  cols?: FilterColumn[],
): Params => {
  const params: Params = {};
  CLEARED_FIELDS.forEach((field) => {
    (params as any)[field] = undefined;
  });
  rows.forEach((row) => {
    if (!row.column || !row.operator) return;
    const patch = ROW_RULES.reduce<Params | null>(
      (found, rule) => found ?? rule(row, cols),
      null,
    );
    if (!patch) return;
    // searchFields and customAttributes accumulate across rows; everything else
    // is a straight assignment.
    const { searchFields, customAttributes, ...rest } = patch;
    Object.assign(params, rest);
    if (searchFields) {
      params.searchFields = [...(params.searchFields ?? []), ...searchFields];
    }
    if (customAttributes) {
      params.customAttributes = {
        ...(params.customAttributes ?? {}),
        ...customAttributes,
      };
    }
  });
  return params;
};
