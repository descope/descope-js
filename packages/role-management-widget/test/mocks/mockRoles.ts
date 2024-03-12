export const mockRoles = {
  roles: [
    {
      name: 'Tenant Admin',
      description: '',
      permissionNames: ['Permission 1'],
      createdTime: 1706819237,
      tenantId: 't1',
    },
    {
      name: 'Role 1',
      description: '',
      permissionNames: ['Permission 1'],
      createdTime: 1707732871,
      tenantId: 't1',
    },
    {
      name: 'Role 2',
      description: 'lulu',
      permissionNames: ['Permission 2'],
      createdTime: 1707732871,
      tenantId: 't1',
    },
  ],
};

export const mockNewRole = {
  name: 'Role New',
  description: 'Desc New',
  permissionNames: ['Permission New'],
  createdTime: 1707732872,
  tenantId: 't1',
};

export const mockRolesPermissions = {
  permissions: [
    {
      name: 'Permission 1',
    },
    {
      name: 'Permission 2',
    },
    {
      name: 'Permission 3',
    },
  ],
};
