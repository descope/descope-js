import { FilterColumn, FilterOption } from '@descope/sdk-component-drivers';
import { CustomAttr, Role } from '../api/types';

export const CA_COL_PREFIX = 'customAttributes.';
export const ROLES_COLUMN_ID = 'roles';

// These helpers finish the <descope-filter> columns at runtime: they fill the
// value combo-box options that can only be known live. Everything else is
// published as-is by console-app.

// One CA option as {value,label}. Most arrive that way; some attributes return
// plain strings, so accept both.
const toOption = (option: unknown): FilterOption => {
  if (typeof option === 'string') return { value: option, label: option };
  const { value, label } = option as { value: string; label?: string };
  return { value, label: label || value };
};

// A CA's select options as {value,label}, or undefined when it has none.
const optionsFromAttr = (attr: CustomAttr): FilterOption[] | undefined =>
  Array.isArray(attr.options) && attr.options.length
    ? attr.options.map(toOption)
    : undefined;

// Fill one custom-attribute column's combo-box from the live CA schema (console
// omits select options, since they drift after publish) and backfill its label.
// Returns the column unchanged when its attribute is gone.
const enrichColumn = (
  col: FilterColumn,
  customAttrs: CustomAttr[] | undefined,
): FilterColumn => {
  const name = col.id.slice(CA_COL_PREFIX.length);
  const attr = customAttrs?.find((candidate) => candidate.name === name);
  if (!attr) return col;

  const label = col.label || attr.displayName || name;
  const options = optionsFromAttr(attr);

  const enriched: FilterColumn = { ...col, label };
  if (options) enriched.options = options;
  return enriched;
};

// For every custom-attribute column in the filter, fill its value combo-box from
// the live CA schema. Non-CA columns and nullish entries pass through untouched.
export const enrichFilterCustomAttributeColumns = (
  cols: FilterColumn[],
  customAttrs: CustomAttr[] | undefined,
): FilterColumn[] =>
  cols
    // Drop a custom-attribute column whose attribute no longer exists, so users
    // cannot filter on a deleted attribute (which always returns zero results).
    // Keep everything while the schema is still loading (customAttrs undefined).
    .filter((col) => {
      if (!col?.id?.startsWith(CA_COL_PREFIX) || customAttrs === undefined) {
        return true;
      }
      const name = col.id.slice(CA_COL_PREFIX.length);
      return customAttrs.some((attr) => attr.name === name);
    })
    .map((col) =>
      col?.id?.startsWith(CA_COL_PREFIX) ? enrichColumn(col, customAttrs) : col,
    );

// Resolve the Roles column in the filter against the tenant's roles: drop the
// column when there are none, else fill its value combo-box with the role list.
export const applyFilterRolesColumn = (
  cols: FilterColumn[],
  tenantRoles: Role[] | undefined,
): FilterColumn[] => {
  if (!tenantRoles?.length) {
    return cols.filter((col) => col?.id !== ROLES_COLUMN_ID);
  }
  const options: FilterOption[] = tenantRoles.map((role) => ({
    value: role.name,
    label: role.name,
  }));
  return cols.map((col) =>
    col?.id === ROLES_COLUMN_ID ? { ...col, options } : col,
  );
};
