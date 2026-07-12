import { FilterColumn } from '@descope/sdk-component-drivers';
import { FilterRow, SearchUsersConfig } from '../api/types';

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

// Per-column value translation: UI/legacy values → wire values accepted by
// /v1/mgmt/user/search (SearchUsersRequest proto). Backend rejects unknown
// status strings — translate UI 'active' to wire 'enabled'.
const VALUE_TRANSLATIONS: Record<string, Record<string, string>> = {
  status: { active: 'enabled' },
};

// Text columns: which operators route to which field. `equal` uses the exact
// array field; everything else (contains/starts-with/etc) falls back to the
// `text` full-text search field.
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
// still uses the flat exact/text fields below, so search keeps working when the
// BE searchFields flag is off; only these richer ops need searchFields.
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

const toArray = (v: FilterRow['value']): string[] => {
  if (Array.isArray(v)) return v;
  if (v == null || v === '') return [];
  return [String(v)];
};

const translateValues = (column: string, values: string[]): string[] => {
  const map = VALUE_TRANSLATIONS[column];
  if (!map) return values;
  return values.map((v) => map[v] ?? v);
};

// Parse a CA row value per the column's declared `inputType`. WC always
// emits strings; BE jsonpath equality is type-strict (`@ == "true"` won't
// match stored bool `true`). Without parsing, bool/numeric CA filters look
// broken (zero results, no error).
//
// Returns `undefined` to signal "drop this row" (unparseable bool, NaN
// numeric, empty value, etc.).
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

// Translate descope-filter `filter-apply` event detail.value into native
// SearchUsersRequest fields. Negation (`not-any-of`/`not-equal`/etc) is
// unsupported by the endpoint and dropped — restrict via column `operators`
// allowlist in console-app metadata to prevent users from picking it.
//
// `cols` is the live filter column schema (`this.filter.data`) used to parse
// CA bool/numeric string values into JS bool/number for BE jsonpath equality.
// Optional — when absent, values pass through as strings (back-compat).
//
// Seeds all touched fields with `undefined` so a removed row clears its
// value instead of being retained by the searchUsers thunk merge.
export const filterToSearchParams = (
  rows: FilterRow[],
  cols?: FilterColumn[],
): Partial<SearchUsersConfig> => {
  const params: Partial<SearchUsersConfig> = {};
  [
    ...Object.values(ARRAY_FIELDS),
    ...Object.values(EXACT_FIELDS),
    ...Object.values(BOOLEAN_FIELDS),
    'text' as const,
    'searchFields' as const,
    'customAttributes' as const,
  ].forEach((field) => {
    (params as any)[field] = undefined;
  });

  rows.forEach((row) => {
    if (!row.column || !row.operator) return;

    // searchFields path: text-column fuzzy/negation ops → BE LIKE engine.
    // Handled before the not-* drop below so negation reaches the BE here.
    if (LIKE_FIELD_MAP[row.column] && SEARCH_FIELD_OPS.has(row.operator)) {
      const v = Array.isArray(row.value) ? row.value[0] : row.value;
      if (v == null || v === '') return;
      params.searchFields = params.searchFields || [];
      params.searchFields.push({
        field: LIKE_FIELD_MAP[row.column],
        valStr: String(v),
        ...(row.operator.startsWith('not-') ? { negative: true } : {}),
      });
      return;
    }

    // Other negation ops remain unsupported on the flat path — drop them.
    if (row.operator.startsWith('not-')) return;

    if (row.column.startsWith(CA_COL_PREFIX)) {
      const name = row.column.slice(CA_COL_PREFIX.length);
      if (!name) return;
      // `is-empty` op: BE matches users with no value / null / default for the
      // attribute when value === null (gated server-side by feature flag
      // UserSearchEmptyCustomAttr).
      if (row.operator === 'is-empty') {
        params.customAttributes = params.customAttributes || {};
        (params.customAttributes as any)[name] = null;
        return;
      }
      // BE jsonpath equality is type-strict — parse string→bool/number per
      // the column's declared `inputType`. Array values (multiselect CAs)
      // preserved; unparseable values drop the row.
      const col = cols?.find((c) => c.id === row.column);
      const value = parseCaValue(row.value, col?.inputType);
      if (value === undefined) return;
      params.customAttributes = params.customAttributes || {};
      (params.customAttributes as any)[name] = value;
      return;
    }

    if (BOOLEAN_FIELDS[row.column] && row.operator === 'equal') {
      const v = Array.isArray(row.value) ? row.value[0] : row.value;
      if (v === 'true') (params as any)[BOOLEAN_FIELDS[row.column]] = true;
      else if (v === 'false')
        (params as any)[BOOLEAN_FIELDS[row.column]] = false;
      return;
    }

    if (ARRAY_FIELDS[row.column]) {
      const arr = toArray(row.value);
      if (!arr.length) return;
      (params as any)[ARRAY_FIELDS[row.column]] = translateValues(
        row.column,
        arr,
      );
      return;
    }

    if (TEXT_COLUMNS.has(row.column)) {
      const arr = toArray(row.value);
      if (!arr.length) return;
      if (row.operator === 'equal' && EXACT_FIELDS[row.column]) {
        (params as any)[EXACT_FIELDS[row.column]] = arr;
      } else {
        // contains / starts-with / ends-with → full-text search.
        // Last text row wins (proto only exposes a single `text` string).
        [(params as any).text] = arr;
      }
    }
  });

  return params;
};
