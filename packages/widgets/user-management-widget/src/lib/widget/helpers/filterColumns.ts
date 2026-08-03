import { FilterColumn, FilterOption } from '@descope/sdk-component-drivers';
import { CustomAttr, Role } from '../api/types';

export const CA_COL_PREFIX = 'customAttributes.';
export const ROLES_COLUMN_ID = 'roles';

// Enrich a single `customAttributes.<name>` column from the runtime CA schema.
// inputType/operators are already resolved and baked into the published column
// by console-app (the single owner of the CA type → filter mapping); we only
// attach the *live* option set (which console deliberately omits, since options
// drift after publish) and backfill the label. Returns the column unchanged
// when the attribute is missing.
export const enrichCustomAttributeCol = (
  col: FilterColumn,
  customAttrs: CustomAttr[] | undefined,
): FilterColumn => {
  const name = col.id.slice(CA_COL_PREFIX.length);
  const attr = customAttrs?.find((a) => a.name === name);
  if (!attr) return col;
  // Select options already arrive as {value,label} from the API; keep them,
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

// Enrich every custom-attribute column in a pick list, leaving other columns
// untouched.
export const enrichCustomAttributeCols = (
  cols: FilterColumn[],
  customAttrs: CustomAttr[] | undefined,
): FilterColumn[] =>
  cols.map((c) =>
    c?.id?.startsWith(CA_COL_PREFIX)
      ? enrichCustomAttributeCol(c, customAttrs)
      : c,
  );

// Resolve the Roles column against the tenant's roles: drop it when there are
// none, else populate its options from the role list.
export const applyRolesColumn = (
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
