export const mockOutboundApps = [
  {
    id: 'obapp1',
    name: 'Github',
    description: 'Github Connect',
    logo: 'logo1',
  },
  {
    id: 'obapp2',
    name: 'Facebook',
    description: 'Facebook connect',
    logo: 'logo2',
  },
  {
    id: 'obapp3',
    name: 'Custom',
    description: 'Custom auth',
    logo: 'logo3',
  },
];

export const mockConnectedApps = ['obapp1'];

export const mockUser = {
  loginIds: ['test@user.com'],
  userId: 'abcdefg1234',
  name: 'Test User',
  email: 'test@user.com',
  phone: '',
  verifiedEmail: true,
  verifiedPhone: true,
  roleNames: [],
  userTenants: [],
  status: 'enabled',
  externalIds: ['tomer@descope.com'],
  picture: '',
  test: false,
  customAttributes: {},
  createdTime: 1751460481,
  TOTP: false,
  SAML: false,
  OAuth: {},
  webauthn: false,
  password: false,
  ssoAppIds: [],
  givenName: '',
  middleName: '',
  familyName: '',
  SCIM: false,
};
