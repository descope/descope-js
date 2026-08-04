import { FilterColumn, FilterOption } from '@descope/sdk-component-drivers';
import { CustomAttr, Role } from '../api/types';

export const CA_COL_PREFIX = 'customAttributes.';
export const ROLES_COLUMN_ID = 'roles';

// These helpers build the column list handed to the <descope-filter> component.
// "Column" here is a filter row's config, and its `options` are the choices in
// that row's value combo-box (the dropdown a user picks from). We fill in the
// options that can only be known at runtime; everything else is published as-is
// by console-app.

// Fill the value combo-box for one custom-attribute filter column from the live
// CA schema. console-app omits a select attribute's choices from the published
// column (they drift after publish), so we attach the current {value,label}
// options here and backfill a missing label. inputType/operators/mapping are
// trusted as published. Returns the column unchanged when its attribute is gone.
const enrichColumn = (
  col: FilterColumn,
  customAttrs: CustomAttr[] | undefined,
): FilterColumn => {
  const name = col.id.slice(CA_COL_PREFIX.length);
  const attr = customAttrs?.find((a) => a.name === name);
  if (!attr) return col;
  // Combo-box options already arrive as {value,label} from the API; keep them,
  // just backfill a missing label from the value.
  const options =
    Array.isArray(attr.options) && attr.options.length
      ? attr.options.map((o) => ({ value: o.value, label: o.label || o.value }))
      : undefined;
  return {
    ...col,
    label: col.label || attr.displayName || name,
    ...(options ? { options } : {}),
  };
};

// For every custom-attribute column in the filter, fill its value combo-box from
// the live CA schema. Non-CA columns and nullish entries pass through untouched.
export const enrichFilterCustomAttributeColumns = (
  cols: FilterColumn[],
  customAttrs: CustomAttr[] | undefined,
): FilterColumn[] =>
  cols.map((c) =>
    c?.id?.startsWith(CA_COL_PREFIX) ? enrichColumn(c, customAttrs) : c,
  );

// Resolve the Roles column in the filter against the tenant's roles: drop the
// column when there are none, else fill its value combo-box with the role list.
export const applyFilterRolesColumn = (
  cols: FilterColumn[],
  tenantRoles: Role[] | undefined,
): FilterColumn[] => {
  if (!tenantRoles?.length) {
    return cols.filter((c) => c?.id !== ROLES_COLUMN_ID);
  }
  const options: FilterOption[] = tenantRoles.map((r) => ({
    value: r.name,
    label: r.name,
  }));
  return cols.map((c) => (c?.id === ROLES_COLUMN_ID ? { ...c, options } : c));
};
