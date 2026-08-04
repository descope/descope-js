/*
 * Build the body of a POST /user/search request from the filter UI's rows.
 *
 * A row is what the user picked in the filter: { column, operator, value }.
 * This file turns the rows into the fields the search request expects. Example:
 *
 *   row:    { column: 'status', operator: 'is-any-of', value: ['active'] }
 *   result: { statuses: ['enabled'] }
 *
 * Backend field names are not hard-coded here. Each column carries a `mapping`
 * (authored in the console editor) that says which request field it writes; this
 * file just reads it. Unknown mapping kinds are skipped, so an older SDK keeps
 * working against newer config.
 */
import { FilterColumn } from '@descope/sdk-component-drivers';
import {
  FieldMapping,
  FilterableColumn,
  FilterRow,
  SearchUsersConfig,
} from '../api/types';

type Params = Partial<SearchUsersConfig>;

// --- Types ---

type ArrayMapping = Extract<FieldMapping, { kind: 'array' }>;
type BooleanMapping = Extract<FieldMapping, { kind: 'boolean' }>;
type TextMapping = Extract<FieldMapping, { kind: 'text' }>;
type CustomAttributeMapping = Extract<
  FieldMapping,
  { kind: 'customAttribute' }
>;

// --- Operators ---

// Operators handled as substring search. LIKE_OPS use the searchFields LIKE
// query when the column sets a like field; FULLTEXT_OPS are the positive subset
// that can fall back to the flat `text` field when it does not.
const LIKE_OPS = new Set([
  'contains',
  'not-contains',
  'starts-with',
  'ends-with',
  'not-equal',
]);
const FULLTEXT_OPS = new Set(['contains', 'starts-with', 'ends-with']);

// --- Value helpers ---

// The one value of a single-value row (equal, contains, ...) as a string, or
// null when empty. The value may arrive bare or wrapped in a one-item array, so
// unwrap it. (Multi-value rows use toArray instead.)
const singleValue = (value: FilterRow['value']): string | null => {
  const unwrapped = Array.isArray(value) ? value[0] : value;
  return unwrapped == null || unwrapped === '' ? null : String(unwrapped);
};

// The row's value as a string array (empty array when there is no value).
const toArray = (value: FilterRow['value']): string[] => {
  if (Array.isArray(value)) return value;
  return value == null || value === '' ? [] : [String(value)];
};

// Convert a custom-attribute value to the type its column declares. The backend
// matches custom attributes by exact type, so a number attribute needs a real
// number (5), not the string "5". Returns undefined when there is nothing to
// send, which the caller reads as "skip this row".
const convertCustomAttributeValue = (
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
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  }
  return value;
};

// --- Output channels ---

// The search request expresses a filter three ways, and every handler result
// targets one of them:
//   directField    a typed top-level param (statuses, text, emails, ...)
//   searchField    an entry in searchFields[] (LIKE/substring, can be negated)
//   customAttr     an entry in customAttributes{} (per-project dynamic attrs)
// searchFields and customAttributes accumulate across rows (see mergePatch);
// direct fields are set outright.
const directField = (field: string, value: unknown): Params =>
  ({ [field]: value }) as Params;

const searchField = (
  field: string,
  valStr: string,
  negative: boolean,
): Params => ({
  searchFields: [{ field, valStr, ...(negative ? { negative: true } : {}) }],
});

const customAttr = (name: string, value: unknown): Params =>
  ({ customAttributes: { [name]: value } }) as Params;

// --- Row handlers (one per mapping kind) ---

// Each handler turns one row into request fields. Returns null when the mapping
// cannot express the row's operator (caller drops it), or {} when there is
// nothing to send (for example an empty value).

// array: is-any-of into a direct field, mapped through valueMap when set.
const mapArrayRow = (mapping: ArrayMapping, row: FilterRow): Params | null => {
  if (row.operator !== 'is-any-of') return null;
  const values = toArray(row.value);
  if (!values.length) return {};
  const mapped = mapping.valueMap
    ? values.map((value) => mapping.valueMap![value] ?? value)
    : values;
  return directField(mapping.field, mapped);
};

// boolean: equal true/false into a direct field.
const mapBooleanRow = (
  mapping: BooleanMapping,
  row: FilterRow,
): Params | null => {
  if (row.operator !== 'equal') return null;
  const value = singleValue(row.value);
  if (value === 'true') return directField(mapping.field, true);
  if (value === 'false') return directField(mapping.field, false);
  return {};
};

// Exact match: the values into a direct field (empty when the row has no value).
const textExactMatch = (field: string, row: FilterRow): Params => {
  const values = toArray(row.value);
  return values.length ? directField(field, values) : {};
};

// Fuzzy match: a searchField entry. The row supplies the `%` wrapping via
// prefix/suffix; a `not-` operator makes it a negative match.
const textLikeMatch = (field: string, row: FilterRow): Params => {
  const value = singleValue(row.value);
  if (value === null) return {};
  const valStr = `${row.prefix ?? ''}${value}${row.suffix ?? ''}`;
  return searchField(field, valStr, row.operator.startsWith('not-'));
};

// Full-text: the value into the `text` direct field (flat search box query).
const textFullTextMatch = (row: FilterRow): Params => {
  const value = singleValue(row.value);
  return value === null ? {} : directField('text', value);
};

// Can this row be an exact match? `equal` on a column that has an exact field.
const canExactMatch = (
  mapping: TextMapping,
  row: FilterRow,
): mapping is TextMapping & { exactField: string } =>
  row.operator === 'equal' && mapping.exactField != null;

// Can this row be a LIKE match? a substring operator on a column with a like field.
const canLikeMatch = (
  mapping: TextMapping,
  row: FilterRow,
): mapping is TextMapping & { likeField: string } =>
  LIKE_OPS.has(row.operator) && mapping.likeField != null;

// Can this row fall back to full-text? any positive substring operator, or equal.
const canFullTextMatch = (row: FilterRow): boolean =>
  FULLTEXT_OPS.has(row.operator) || row.operator === 'equal';

// text: pick one of the three matches by which one the row qualifies for. An
// operator that fits none (for example a negation on a column with no like
// field) returns null so the caller drops the row.
const mapTextRow = (mapping: TextMapping, row: FilterRow): Params | null => {
  if (canExactMatch(mapping, row))
    return textExactMatch(mapping.exactField, row);
  if (canLikeMatch(mapping, row)) return textLikeMatch(mapping.likeField, row);
  if (canFullTextMatch(row)) return textFullTextMatch(row);
  return null;
};

// Does this row ask for an empty attribute? the is-empty operator.
const isEmptyOperator = (row: FilterRow): boolean =>
  row.operator === 'is-empty';

// Does this row match against a value? equal (one value) or is-any-of (a list).
const isValueOperator = (row: FilterRow): boolean =>
  row.operator === 'equal' || row.operator === 'is-any-of';

// customAttribute: a customAttr entry. is-empty sends null; otherwise the value
// is converted to the column's declared type.
const mapCustomAttributeRow = (
  mapping: CustomAttributeMapping,
  row: FilterRow,
  inputType: FilterColumn['inputType'] | undefined,
): Params | null => {
  if (isEmptyOperator(row)) return customAttr(mapping.name, null);
  if (!isValueOperator(row)) return {};
  const value = convertCustomAttributeValue(row.value, inputType);
  return value === undefined ? {} : customAttr(mapping.name, value);
};

// Send the row to the handler for its mapping kind. If there is no mapping, or
// the kind is one this SDK does not know (newer config), returns null and the
// caller skips the row.
const mapRow = (col: FilterableColumn, row: FilterRow): Params | null => {
  const { mapping } = col;
  if (!mapping) return null;

  switch (mapping.kind) {
    case 'array':
      return mapArrayRow(mapping, row);
    case 'boolean':
      return mapBooleanRow(mapping, row);
    case 'text':
      return mapTextRow(mapping, row);
    case 'customAttribute':
      return mapCustomAttributeRow(mapping, row, col.inputType);
    default:
      return null;
  }
};

// --- Request assembly ---

// The request fields this filter can write, so the caller can blank them before
// applying rows. `text` is left out on purpose: it is shared with the standalone
// search box, and clearing it would erase what the user typed there.
const fieldsToClear = (cols: FilterableColumn[]): Set<string> => {
  const fields = new Set<string>(['searchFields', 'customAttributes']);
  cols.forEach((col) => {
    const { mapping } = col;
    if (!mapping) return;
    if (mapping.kind === 'array' || mapping.kind === 'boolean') {
      fields.add(mapping.field);
    } else if (mapping.kind === 'text' && mapping.exactField) {
      fields.add(mapping.exactField);
    }
  });
  return fields;
};

// Append a row's searchFields onto the ones collected so far.
const appendSearchFields = (
  base: Params['searchFields'],
  incoming: NonNullable<Params['searchFields']>,
): Params['searchFields'] => [...(base ?? []), ...incoming];

// Merge a row's customAttributes onto the ones collected so far.
const mergeCustomAttributes = (
  base: Params['customAttributes'],
  incoming: NonNullable<Params['customAttributes']>,
): Params['customAttributes'] => ({ ...(base ?? {}), ...incoming });

// Merge one row's result onto the request so far and return the new request.
// searchFields and customAttributes build up across rows; every other field is
// set directly.
const mergePatch = (params: Params, patch: Params): Params => {
  const { searchFields, customAttributes, ...directFields } = patch;

  const mergedSearchFields = searchFields
    ? appendSearchFields(params.searchFields, searchFields)
    : params.searchFields;

  const mergedCustomAttributes = customAttributes
    ? mergeCustomAttributes(params.customAttributes, customAttributes)
    : params.customAttributes;

  return {
    ...params,
    ...directFields,
    searchFields: mergedSearchFields,
    customAttributes: mergedCustomAttributes,
  };
};

// The row's column, or undefined when the row is incomplete or names a column
// that is not in the current set.
const columnForRow = (
  row: FilterRow,
  byId: Map<string, FilterableColumn>,
): FilterableColumn | undefined => {
  if (!row.column || !row.operator) return undefined;
  return byId.get(row.column);
};

// --- Entry point ---

// Build the /user/search body from the filter's rows and columns.
export const filterToSearchParams = (
  rows: FilterRow[],
  cols: FilterableColumn[] = [],
): Params => {
  // The search remembers the previous params and merges the new ones on top, so
  // a filter the user removed would otherwise stay applied. Start by setting
  // every filterable field to undefined to clear it; the active rows below then
  // set the ones still in use.
  const cleared: Params = {};

  fieldsToClear(cols).forEach((field) => {
    (cleared as any)[field] = undefined;
  });

  const byId = new Map(cols.map((c) => [c.id, c]));

  // Merge each row's result on top of the cleared base.
  return rows.reduce((params, row) => {
    const col = columnForRow(row, byId);
    if (!col) return params;
    const patch = mapRow(col, row);
    return patch ? mergePatch(params, patch) : params;
  }, cleared);
};
