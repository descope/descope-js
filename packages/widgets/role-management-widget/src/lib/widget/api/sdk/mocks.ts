import {
  CreateRoleConfig,
  Permission,
  Role,
  SearchRolesConfig,
  UpdateRoleConfig,
} from '../types';

const search: (
  config: SearchRolesConfig,
  tenantId: string,
) => Promise<Role[]> = async ({ text, sort }, tenantId) =>
  new Promise((resolve) => {
    const roles: Role[] = [];
    for (let i = 1; i < 10; i += 1) {
      roles.push({
        name: `Role ${i}`,
        description: `Role description ${i}`,
        permissionNames: [`Permission ${i}`],
        createdTime: new Date(),
        tenantId,
      });
    }
    sort.forEach((s) => {
      roles.sort((a, b) =>
        !s.desc
          ? (a[s.field] as string)?.localeCompare(b[s.field] as string)
          : (b[s.field] as string)?.localeCompare(a[s.field] as string),
      );
    });
    resolve(
      roles.filter(
        (role) =>
          role.name.toLowerCase().includes(text.toLowerCase()) ||
          role.description.toLowerCase().includes(text.toLowerCase()),
      ),
    );
  });

const create: (
  config: CreateRoleConfig,
  tenantId: string,
) => Promise<Role> = async ({ name, description, permissionNames }, tenantId) =>
  new Promise((resolve) => {
    resolve({
      name,
      description,
      permissionNames,
      createdTime: new Date(),
      tenantId,
    });
  });

const update: (
  config: UpdateRoleConfig,
  tenantId: string,
) => Promise<Role & { oldName: string }> = async (
  { name, newName, description, permissionNames },
  tenantId,
) =>
  new Promise((resolve) => {
    resolve({
      name: newName,
      description,
      permissionNames,
      createdTime: new Date(),
      oldName: name,
      tenantId,
    });
  });

const deleteBatch = async () => {};

const getTenantPermissions = (): Promise<{
  permissions: Permission[];
}> =>
  new Promise((resolve) => {
    const permissions: Permission[] = [];
    for (let i = 1; i < 5; i += 1) {
      permissions.push({
        name: `Permission ${i}`,
      });
    }
    resolve({ permissions });
  });

const role = {
  search,
  create,
  update,
  deleteBatch,
};
const tenants = {
  getTenantPermissions,
};
export { role, tenants };
