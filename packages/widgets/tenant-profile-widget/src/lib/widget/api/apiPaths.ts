export const apiPaths = {
  user: {
    me: '/v1/auth/me',
  },
  tenant: {
    get: '/v1/mgmt/tenant',
    getTenantAdminLinkSSO: '/v1/mgmt/tenant/adminlinks/sso/authenticated',
  },
};
