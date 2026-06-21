import { FilterRow, SearchUsersConfig } from '../../../api/types';

// Multi-value columns map directly to native exact-match array fields.
const ARRAY_FIELDS: Record<string, keyof SearchUsersConfig> = {
  status: 'statuses',
  roles: 'roleNames',
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

// Translate descope-filter `filter-apply` event detail.value into native
// SearchUsersRequest fields. Negation (`not-any-of`/`not-equal`/etc) is
// unsupported by the endpoint and dropped — restrict via column `operators`
// allowlist in console-app metadata to prevent users from picking it.
//
// Seeds all touched fields with `undefined` so a removed row clears its
// value instead of being retained by the searchUsers thunk merge.
export const filterToSearchParams = (
  rows: FilterRow[],
): Partial<SearchUsersConfig> => {
  const params: Partial<SearchUsersConfig> = {};
  [
    ...Object.values(ARRAY_FIELDS),
    ...Object.values(EXACT_FIELDS),
    'text' as const,
  ].forEach((field) => {
    (params as any)[field] = undefined;
  });

  rows.forEach((row) => {
    if (!row.column || !row.operator || row.operator.startsWith('not-')) return;

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
        (params as any).text = arr[0];
      }
    }
  });

  return params;
};
