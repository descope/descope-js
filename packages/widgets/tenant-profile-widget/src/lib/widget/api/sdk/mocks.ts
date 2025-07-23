import { Tenant, TenantAdminLinkSSOResponse, User } from '../types';

const me: () => Promise<User> = async () =>
  new Promise((resolve) => {
    resolve({
      loginIds: [`user@company.com`],
      externalIds: [`user@company.com`],
      userId: `user-1`,
      name: `Test User`,
      email: `user@company.com`,
      roleNames: [`Role`],
      phone: `+1-202-555-010`,
      verifiedEmail: true,
      verifiedPhone: true,
      userTenants: [],
      status: 'enabled',
      editable: true,
      createdTime: new Date().getTime(),
      customAttributes: {},
      familyName: '',
      givenName: '',
      middleName: '',
      picture: undefined,
      password: true,
      SAML: false,
      test: false,
      TOTP: false,
      webauthn: true,
    });
  });

const user = {
  me,
};

const get: () => Promise<Tenant> = async () =>
  new Promise((resolve) => {
    resolve({
      // create tenant mocks
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
    });
  });

const getTenantAdminLinkSSO: () => Promise<TenantAdminLinkSSOResponse> =
  async () =>
    new Promise((resolve) => {
      resolve({
        adminSSOConfigurationLink: '_blank',
      });
    });

const tenantMock = {
  get,
  getTenantAdminLinkSSO,
};

export { tenantMock, user };
