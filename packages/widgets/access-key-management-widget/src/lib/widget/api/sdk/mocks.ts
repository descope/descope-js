import {
  AccessKey,
  CreateAccessKeyConfig,
  Role,
  SearchAccessKeyConfig,
} from '../types';

const search: (config: SearchAccessKeyConfig) => Promise<AccessKey[]> = async ({
  text,
  sort,
} = {}) =>
  new Promise((resolve) => {
    const keys: AccessKey[] = [];
    for (let i = 1; i < 10; i += 1) {
      keys.push({
        id: `access-key-id-${i}`,
        name: `Access Key ${i}`,
        createdBy: `User ${i}`,
        editable: true,
        expireTime: new Date().getTime() / 1000 + 60 * 60 * 24 * 30,
        createdTime: new Date().getTime() / 1000,
        roleNames: [`Role ${i}`],
        status: 'active',
        clientId: `Client ID ${i}`,
        boundUserId: `User ${i}`,
      });
    }
    sort.forEach((s) => {
      keys.sort((a, b) =>
        !s.desc
          ? (a[s.field] as string)?.localeCompare(b[s.field] as string)
          : (b[s.field] as string)?.localeCompare(a[s.field] as string),
      );
    });
    resolve(
      keys.filter(
        (key) =>
          key.name.toLowerCase().includes(text.toLowerCase()) ||
          key.createdBy.toLowerCase().includes(text.toLowerCase()),
      ),
    );
  });

const create: (
  config: CreateAccessKeyConfig,
  expireTime: number,
) => Promise<{ cleartext: string; key: AccessKey }> = async (
  { name, roleNames, userId },
  expireTime,
) => {
  const i = Math.random().toString(10).substring(15);
  return new Promise((resolve) => {
    resolve({
      cleartext: Math.random().toString(20).substring(2),
      key: {
        id: `access-key-id-${i}`,
        name: name || `Access Key ${i}`,
        createdBy: userId || `User ${i}`,
        editable: true,
        expireTime,
        createdTime: new Date().getTime() / 1000,
        roleNames,
        status: 'active',
        clientId: `Client ID ${i}`,
        boundUserId: userId || `User ${i}`,
      },
    });
  });
};

const activate = async () => {};

const deactivate = async () => {};

const deleteBatch = async () => {};

const getTenantRoles = (
  tenant: string,
): Promise<{
  roles: Role[];
}> =>
  new Promise((resolve) => {
    const roles: Role[] = [];
    for (let i = 1; i < 5; i += 1) {
      roles.push({
        name: `Role ${i}`,
        description: `Role description ${i}`,
        createdTime: new Date(),
        permissionNames: [`Permission ${i}`],
        tenantId: tenant,
      });
    }
    resolve({ roles });
  });

const accessKey = {
  search,
  create,
  activate,
  deactivate,
  deleteBatch,
};
const tenants = {
  getTenantRoles,
};
export { accessKey, tenants };
