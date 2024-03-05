export const apiPaths = {
  user: {
    search: '/v1/mgmt/user/search',
    deleteBatch: '/v1/mgmt/user/delete/batch',
    create: '/v1/mgmt/user/create',
    update: '/v1/mgmt/user/update',
    enable: '/v1/mgmt/user/update/status',
    disable: '/v1/mgmt/user/update/status',
    resetPassword: '/v1/mgmt/user/password/set/temporary',
    removePasskey: '/v1/mgmt/user/passkeys/delete',
    expirePassword: '/v1/mgmt/user/password/expire',
    customAttributes: '/v1/mgmt/user/customattributes',
  },
  tenant: {
    roles: '/v1/mgmt/role/all',
  },
};
