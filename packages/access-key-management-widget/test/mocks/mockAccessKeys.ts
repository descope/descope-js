import {
  AccessKey,
  CreateAccessKeyConfig,
} from '../../src/lib/widget/api/types';

export const mockAccessKeys: Record<string, AccessKey[]> = {
  keys: [
    {
      id: '1',
      name: 'Access Key 1',
      clientId: 'Client id 1',
      createdBy: 'created by 1',
      roleNames: [],
      createdTime: new Date(),
      expireTime: new Date().getTime(),
      status: 'active',
    },
    {
      id: '2',
      name: 'Access Key 2',
      clientId: 'Client id 2',
      createdBy: 'created by 2',
      roleNames: [],
      createdTime: new Date(),
      expireTime: new Date().getTime(),
      status: 'active',
    },
    {
      id: '3',
      name: 'Access Key 3',
      clientId: 'Client id 3',
      createdBy: 'created by 3',
      roleNames: [],
      createdTime: new Date(),
      expireTime: new Date().getTime(),
      status: 'active',
    },
  ],
};

export const mockNewAccessKey: CreateAccessKeyConfig = {
  name: 'Access Key New',
  expiration: '0',
  userId: 'some user id',
  roleNames: ['aa', 'bb'],
};

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
