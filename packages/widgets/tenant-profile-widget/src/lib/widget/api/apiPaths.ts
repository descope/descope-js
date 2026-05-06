export const apiPaths = {
  user: {
    me: '/v1/auth/me',
  },
  tenant: {
    details: '/v1/mgmt/tenant',
    adminLinkSso: '/v1/mgmt/tenant/adminlinks/sso/authenticated',
    ssoConfigurations: '/v1/mgmt/tenant/sso/configurations',
  },
};
