import {
  ListSsoConfigurationsResponse,
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
  enforceSSOExclusions: ['user1@example.com', 'user2@example.com'],
};

export const mockTenantAdminLinkSSO: TenantAdminLinkSSOResponse = {
  adminSSOConfigurationLink:
    'https://api.descope.TESTEST/sso/setup?tenantId=tenant-1',
};

export const mockSsoConfigurations: ListSsoConfigurationsResponse = {
  configurations: [
    { id: 'default', name: 'Default SSO configuration', isDefault: true },
    { id: 'okta-prod', name: 'Okta — Production' },
  ],
};
