import { User } from '../types';

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
      picture:
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSzmudcbKkbOue75DaM9HDDrt0W39SJLBH-3HPK3s-K1w&s',
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

export { user };
