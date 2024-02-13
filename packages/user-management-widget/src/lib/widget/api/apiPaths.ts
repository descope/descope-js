export const apiPaths = {
  user: {
    search: '/v1/mgmt/user/search',
    deleteBatch: '/v1/mgmt/user/delete/batch',
    create: '/v1/mgmt/user/create',
    expirePassword: '/v1/mgmt/user/password/expire',
    customAttributes: '/v1/mgmt/user/customattributes',
  },
  tenant: {
    roles: '/v1/mgmt/role/all',
  }
};
