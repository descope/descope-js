/*
 * Translate descope-filter `filter-apply` rows into native SearchUsersRequest
 * fields for POST /v1/mgmt/user/search.
 *
 * Why this exists: descope-filter is a generic filter UI that emits
 * (column, operator, value) rows for far more operators than the search
 * endpoint can express. The endpoint's flat fields (statuses/roleNames/
 * emails/booleans/customAttributes) are inclusion-only; the sole negation is
 * NOT LIKE on a few text columns via `searchFields`. So every row is routed by
 * a rule that matches BOTH column and operator — anything the endpoint can't
 * express matches no rule and is dropped, never silently inverted into its
 * positive form (e.g. `status not-any-of` must NOT become `statuses`).
 *
 * Console-app's per-column `operators` allowlist decides what to OFFER; this
 * file decides HOW to translate it.
 */
import { FilterColumn } from '@descope/sdk-component-drivers';
import { FilterRow, SearchUsersConfig } from '../api/types';

type Params = Partial<SearchUsersConfig>;

// CA rows arrive as `customAttributes.<name>` (console opt-in).
const CA_COL_PREFIX = 'customAttributes.';

// Multi-select columns → native array fields (is-any-of).
const ARRAY_FIELDS: Record<string, keyof SearchUsersConfig> = {
  status: 'statuses',
  roles: 'roleNames',
};

// Boolean columns → optional-bool fields (equal only; flip the value for the
// negative case). SCIM's id is uppercase in the UI, lowercase on the wire.
const BOOLEAN_FIELDS: Record<string, keyof SearchUsersConfig> = {
  verifiedEmail: 'verifiedEmail',
  verifiedPhone: 'verifiedPhone',
  password: 'password',
  totp: 'totp',
  webauthn: 'webauthn',
  SCIM: 'scim',
};

// Text columns whose `equal` maps to an exact-match array field.
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

// Text columns the BE can LIKE (widget id → BE column). name/givenName/
// middleName/familyName are a BE gap, so their fuzzy ops stay unexposed.
const LIKE_FIELD_MAP: Record<string, string> = {
  loginIds: 'externalid',
  displayName: 'displayname',
  email: 'email',
  phone: 'phonenumber',
};

// Operators routed to the searchFields LIKE/NOT-LIKE engine; the value is
// already `%`-affixed by the widget per the operator config.
const SEARCH_FIELD_OPS = new Set([
  'contains',
  'not-contains',
  'starts-with',
  'ends-with',
  'not-equal',
]);

// Text operators the flat path can express (exact or full-text). Anything else
// on a text column — notably negations — matches no rule and is dropped.
const TEXT_OPS = new Set(['equal', 'contains', 'starts-with', 'ends-with']);

// UI value → wire value (BE rejects 'active'; expects 'enabled').
const VALUE_TRANSLATIONS: Record<string, Record<string, string>> = {
  status: { active: 'enabled' },
};

// Cleared each apply so a removed row drops its value. `text` is excluded: it
// is co-owned by the standalone search input (initFilterUsersInputMixin), so
// clearing it here would wipe the user's typed query.
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

// Parse a CA value to the column's declared type (BE jsonpath equality is
// type-strict). Returns undefined to signal "drop this row".
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

// A rule maps one (column, operator) category to a params patch: null = not
// mine (try next rule), {} = mine but nothing to add (both stop the chain).
// Rules are pure — the caller owns mutation.
type RowRule = (row: FilterRow, cols?: FilterColumn[]) => Params | null;

// Fuzzy/negation ops on LIKE-able columns → searchFields. The widget emits the
// raw value; the `%` affixes live only in the query. This is the only negation
// the endpoint can express (NOT LIKE via `negative`).
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

const applyCustomAttribute: RowRule = (row, cols) => {
  if (!row.column.startsWith(CA_COL_PREFIX)) return null;
  const name = row.column.slice(CA_COL_PREFIX.length);
  if (!name) return {};
  // is-empty → null (BE matches missing/default; FF-gated server-side).
  if (row.operator === 'is-empty') {
    return { customAttributes: { [name]: null } as any };
  }
  // Only positive equality/membership is expressible.
  if (row.operator !== 'equal' && row.operator !== 'is-any-of') return {};
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
  if (!field || row.operator !== 'is-any-of') return null;
  const arr = toArray(row.value);
  return arr.length
    ? ({ [field]: translateValues(row.column, arr) } as Params)
    : {};
};

const applyText: RowRule = (row) => {
  if (!TEXT_COLUMNS.has(row.column) || !TEXT_OPS.has(row.operator)) return null;
  const arr = toArray(row.value);
  if (!arr.length) return {};
  if (row.operator === 'equal' && EXACT_FIELDS[row.column]) {
    return { [EXACT_FIELDS[row.column]]: arr } as Params;
  }
  // contains/starts-with/ends-with (or equal without an exact field) →
  // full-text. Last text row wins (proto exposes a single `text`).
  return { text: arr[0] };
};

// Order matters: searchFields first (claims LIKE/NOT-LIKE ops before anything
// else); the rest are mutually exclusive by column.
const ROW_RULES: RowRule[] = [
  applySearchField,
  applyCustomAttribute,
  applyBoolean,
  applyArray,
  applyText,
];

// `cols` (this.filter.data) supplies CA inputTypes for value parsing — optional;
// absent → CA values pass through as strings. Each row takes the first matching
// rule; searchFields and customAttributes accumulate across rows, everything
// else is a straight assignment.
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
