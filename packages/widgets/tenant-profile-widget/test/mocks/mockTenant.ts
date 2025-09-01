import {
  Tenant,
  TenantAdminLinkSSOResponse,
} from '../../src/lib/widget/api/types';

export const mockTenant: Tenant = {
  tenantId: 'tenant-1',
  roleNames: ['admin'],
  id: 'tenant-1',
  name: 'Test Tenant',
  selfProvisioningDomains: ['example1.com', 'example2.com'],
  customAttributes: {},
  authType: 'password',
  domains: [],
  createdTime: Date.now(),
  disabled: false,
  enforceSSO: true,
};

export const mockTenantAdminLinkSSO: TenantAdminLinkSSOResponse = {
  adminSSOConfigurationLink:
    'https://api.descope.TESTEST/sso/setup?tenantId=tenant-1',
};
