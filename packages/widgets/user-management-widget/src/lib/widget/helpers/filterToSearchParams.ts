/*
 * Translate descope-filter rows → SearchUsersRequest fields (POST /user/search).
 *
 * - Generic interpreter: no backend field names. Each column in the widget's
 *   `data` carries a `route` describing how its rows map to request fields.
 *   That routing is set at widget-design time (in the console editor) and baked
 *   into the published config — the SDK just reads it, no runtime dependency.
 * - So new/renamed fields and value maps are config changes, not SDK releases.
 * - Unknown route kinds are skipped, so an older SDK never breaks on new config
 *   (a brand-new mechanic still needs SDK support to be used).
 * - Only the structural containers (`searchFields`, `customAttributes`, `text`)
 *   are referenced directly.
 */
import { FilterColumn } from '@descope/sdk-component-drivers';
import { FilterableColumn, FilterRow, SearchUsersConfig } from '../api/types';

type Params = Partial<SearchUsersConfig>;

// Text fuzzy operators routed to the searchFields LIKE engine (with `%` affixes
// supplied on the row) or to full-text when no LIKE field is configured.
const LIKE_OPS = new Set([
  'contains',
  'not-contains',
  'starts-with',
  'ends-with',
  'not-equal',
]);
const FULLTEXT_OPS = new Set(['contains', 'starts-with', 'ends-with']);

const firstValue = (v: FilterRow['value']): string | null => {
  const s = Array.isArray(v) ? v[0] : v;
  return s == null || s === '' ? null : String(s);
};

const toArray = (v: FilterRow['value']): string[] => {
  if (Array.isArray(v)) return v;
  return v == null || v === '' ? [] : [String(v)];
};

// Parse a custom-attribute value to the column's declared type (BE jsonpath
// equality is type-strict). Returns undefined to signal "drop this row".
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

// Build the request-field patch for one row from its column's route. Returns
// null when the row can't be expressed (no route, unknown kind, or an operator
// the kind doesn't support) — the caller then drops the row, so a filter is
// never silently inverted into its positive form.
const routeRow = (col: FilterableColumn, row: FilterRow): Params | null => {
  const { route } = col;
  if (!route) return null;

  switch (route.kind) {
    case 'array': {
      if (row.operator !== 'is-any-of') return null;
      const arr = toArray(row.value);
      if (!arr.length) return {};
      const vals = route.valueMap
        ? arr.map((v) => route.valueMap![v] ?? v)
        : arr;
      return { [route.field]: vals } as Params;
    }

    case 'boolean': {
      if (row.operator !== 'equal') return null;
      const v = firstValue(row.value);
      if (v === 'true') return { [route.field]: true } as Params;
      if (v === 'false') return { [route.field]: false } as Params;
      return {};
    }

    case 'text': {
      if (row.operator === 'equal' && route.exactField) {
        const arr = toArray(row.value);
        return arr.length ? ({ [route.exactField]: arr } as Params) : {};
      }
      if (LIKE_OPS.has(row.operator) && route.likeField) {
        const v = firstValue(row.value);
        if (v === null) return {};
        return {
          searchFields: [
            {
              field: route.likeField,
              valStr: `${row.prefix ?? ''}${v}${row.suffix ?? ''}`,
              ...(row.operator.startsWith('not-') ? { negative: true } : {}),
            },
          ],
        };
      }
      // Positive fuzzy, or `equal` without an exact field → flat full-text.
      // Anything else (e.g. a negation with no LIKE field) is unexpressible.
      if (FULLTEXT_OPS.has(row.operator) || row.operator === 'equal') {
        const v = firstValue(row.value);
        return v === null ? {} : { text: v };
      }
      return null;
    }

    case 'customAttribute': {
      if (row.operator === 'is-empty') {
        return { customAttributes: { [route.name]: null } as any };
      }
      if (row.operator !== 'equal' && row.operator !== 'is-any-of') return {};
      const value = parseCaValue(row.value, col.inputType);
      return value === undefined
        ? {}
        : { customAttributes: { [route.name]: value } as any };
    }

    default:
      return null; // unknown kind → skip (forward-compat)
  }
};

// Fields the current column set can write, cleared each apply so a removed row
// drops its value (the searchUsers thunk merges params). `text` is excluded —
// it is co-owned by the standalone search input, so clearing it here would wipe
// the user's typed query. `searchFields`/`customAttributes` are always cleared
// (filter-owned containers).
const clearedFields = (cols: FilterableColumn[]): Set<string> => {
  const fields = new Set<string>(['searchFields', 'customAttributes']);
  cols.forEach((col) => {
    const { route } = col;
    if (!route) return;
    if (route.kind === 'array' || route.kind === 'boolean') {
      fields.add(route.field);
    } else if (route.kind === 'text' && route.exactField) {
      fields.add(route.exactField);
    }
  });
  return fields;
};

export const filterToSearchParams = (
  rows: FilterRow[],
  cols: FilterableColumn[] = [],
): Params => {
  const params: Params = {};
  clearedFields(cols).forEach((field) => {
    (params as any)[field] = undefined;
  });
  const byId = new Map(cols.map((c) => [c.id, c]));

  rows.forEach((row) => {
    if (!row.column || !row.operator) return;
    const col = byId.get(row.column);
    if (!col) return;
    const patch = routeRow(col, row);
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
