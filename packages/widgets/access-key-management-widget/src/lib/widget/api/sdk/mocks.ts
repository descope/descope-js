import {
  AccessKey,
  CreateAccessKeyConfig,
  Role,
  RotateAccessKeyConfig,
  SearchAccessKeyConfig,
} from '../types';

// keys made by the mock create, so the list reload after a create shows them
const createdKeys: AccessKey[] = [];
// statuses set by the mock activate / deactivate, so the list reload keeps them
const statusOverrides: Record<string, string> = {};
// mock ids and secrets come from a counter: they are fake, and a counter never collides with the static keys
let mockCounter = 0;

const search: (config: SearchAccessKeyConfig) => Promise<AccessKey[]> = async ({
  text,
  sort,
} = {}) =>
  new Promise((resolve) => {
    const keys: AccessKey[] = [...createdKeys];
    const timeMock = new Date().getTime() / 1000 + 60 * 60 * 24 * 30;
    const timeMockFormatted = new Date(timeMock).toLocaleString();
    for (let i = 1; i < 10; i += 1) {
      keys.push({
        id: `access-key-id-${i}`,
        name: `Access Key ${i}`,
        createdBy: `User ${i}`,
        editable: true,
        expireTime: timeMock,
        expireTimeFormatted: timeMockFormatted,
        createdTime: timeMock,
        createdTimeFormatted: timeMockFormatted,
        roleNames: [`Role ${i}`],
        permittedIps: ['127.1.2.3'],
        status: 'active',
        clientId: `Client ID ${i}`,
        boundUserId: `User ${i}`,
      });
    }
    // apply mock status changes before sorting, so a status sort sees them
    keys.forEach((key, idx) => {
      if (statusOverrides[key.id]) {
        keys[idx] = { ...key, status: statusOverrides[key.id] };
      }
    });
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
  { name, roleNames, userId, permittedIps },
  expireTime,
) => {
  mockCounter += 1;
  const i = `new-${mockCounter}`;
  const key: AccessKey = {
    id: `access-key-id-${i}`,
    name: name || `Access Key ${i}`,
    createdBy: userId || `User ${i}`,
    editable: true,
    expireTime,
    createdTime: new Date().getTime() / 1000,
    roleNames,
    permittedIps,
    status: 'active',
    clientId: `Client ID ${i}`,
    boundUserId: userId || `User ${i}`,
  };
  createdKeys.unshift(key);
  return new Promise((resolve) => {
    resolve({
      cleartext: `mock-secret-${i}`,
      key,
    });
  });
};

const activate = async (ids: string[]) => {
  ids.forEach((id) => {
    statusOverrides[id] = 'active';
  });
};

const deactivate = async (ids: string[]) => {
  ids.forEach((id) => {
    statusOverrides[id] = 'inactive';
  });
};

const deleteBatch = async () => {};

const rotate: (
  config: RotateAccessKeyConfig,
) => Promise<{ cleartext: string; key: AccessKey }> = async ({ id }) =>
  new Promise((resolve) => {
    resolve({
      cleartext: `mock-secret-rotated-${id}`,
      key: {
        id,
        name: `Access Key ${id}`,
        createdBy: 'User',
        editable: true,
        expireTime: new Date().getTime() / 1000 + 60 * 60 * 24 * 30,
        createdTime: new Date().getTime() / 1000,
        roleNames: [],
        permittedIps: [],
        status: 'active',
        clientId: `Client ID ${id}`,
        boundUserId: 'User',
      },
    });
  });

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
  rotate,
};
const tenants = {
  getTenantRoles,
};
export { accessKey, tenants };
