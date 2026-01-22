import { Tenant, User, UserTenant } from '../types';

const mockTenants: Tenant[] = [
  {
    tenantName: 'Tenant 1',
    tenantId: 'tn1',
    roleNames: ['Role'],
  },
  {
    tenantName: 'Tenant 2',
    tenantId: 'tn2',
    roleNames: ['Role'],
  },
];

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
      userTenants: mockTenants,
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
      dct: 'tn2',
    });
  });

const devices = () => ({
  devices: [
    {
      id: 'device-id-1',
      name: 'Device 1',
      deviceType: 'desktop',
      lastLoginDate: 1735977600000,
      isCurrent: false,
    },
    {
      id: 'device-id-2',
      name: 'Device 2',
      deviceType: 'mobile',
      lastLoginDate: 1738750500000,
      isCurrentDevice: true,
    },
    {
      id: 'device-id-3',
      name: 'Device 3',
      deviceType: 'tablet',
      lastLoginDate: 1741264200000,
      isCurrent: false,
    },
    {
      id: 'device-id-4',
      name: 'Device 4',
      deviceType: 'unknown',
      lastLoginDate: 1744037100000,
      isCurrent: false,
    },
    {
      id: 'device-id-5',
      name: 'Device 5',
      deviceType: 'desktop',
      lastLoginDate: 1746720000000,
      isCurrent: false,
    },
  ],
});

const user = {
  me,
  devices,
};

export { user };
