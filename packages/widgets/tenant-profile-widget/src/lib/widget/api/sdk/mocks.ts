import {
  ListSsoConfigurationsResponse,
  SsoConfiguration,
  Tenant,
  TenantAdminLinkSSOResponse,
  User,
} from '../types';

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

const mockConfigurations: SsoConfiguration[] = [
  { id: 'default', name: 'Default SSO configuration', isDefault: true },
  { id: 'okta-prod', name: 'Okta — Production', expires: '02/07/2026, 9:52 GMT+2' },
  { id: 'entra-eu', name: 'Microsoft Entra ID — EU' },
];

const listSsoConfigs: () => Promise<ListSsoConfigurationsResponse> = async () =>
  new Promise((resolve) => {
    resolve({ configurations: mockConfigurations });
  });

const createSsoConfig: (args: {
  name: string;
  id?: string;
}) => Promise<SsoConfiguration> = async ({ name, id }) =>
  new Promise((resolve) => {
    const newId = id || name.toLowerCase().replace(/\s+/g, '-');
    resolve({ id: newId, name });
  });

const deleteSsoConfig: (args: { id: string }) => Promise<void> = async () =>
  new Promise((resolve) => resolve());

const tenantMock = {
  get,
  getTenantAdminLinkSSO,
  listSsoConfigs,
  createSsoConfig,
  deleteSsoConfig,
};

export { tenantMock, user };
