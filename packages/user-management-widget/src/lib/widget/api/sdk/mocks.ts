import {
  CreateUserConfig,
  CustomAttr,
  Role,
  SearchUsersConfig,
  UpdateUserConfig,
  User,
} from '../types';

const search: (config: SearchUsersConfig) => Promise<User[]> = async ({
  text,
  sort,
}) =>
  new Promise((resolve) => {
    const users: User[] = [];
    for (let i = 1; i < 10; i += 1) {
      users.push({
        loginIds: [`user${i}@company.com`],
        externalIds: [`user${i}@company.com`],
        userId: `user-${i}`,
        name: `User ${i}`,
        email: `user${i}@company.com`,
        roleNames: [`Role ${i}`],
        phone: `+1-202-555-010${i}`,
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
        picture: '',
        password: true,
        SAML: false,
        test: false,
        TOTP: false,
        webauthn: false,
      });
    }
    sort.forEach((s) => {
      users.sort((a, b) =>
        !s.desc
          ? (a[s.field] as string)?.localeCompare(b[s.field] as string)
          : (b[s.field] as string)?.localeCompare(a[s.field] as string),
      );
    });
    resolve(
      users.filter(
        (user) =>
          user.name.toLowerCase().includes(text.toLowerCase()) ||
          user.phone.toLowerCase().includes(text.toLowerCase()) ||
          user.status.toLowerCase().includes(text.toLowerCase()) ||
          text.toLowerCase() === 'active' ||
          user.familyName.toLowerCase().includes(text.toLowerCase()) ||
          user.givenName.toLowerCase().includes(text.toLowerCase()) ||
          user.middleName.toLowerCase().includes(text.toLowerCase()) ||
          user.email.toLowerCase().includes(text.toLowerCase()),
      ),
    );
  });

const create: (config: CreateUserConfig) => Promise<User> = async ({
  loginId,
  email,
  phone,
  displayName,
  roles,
  customAttributes,
  picture,
  verifiedEmail,
  verifiedPhone,
  givenName,
  middleName,
  familyName,
}) =>
  new Promise((resolve) => {
    const i = Math.random().toString(10).substring(15);
    resolve({
      loginIds: [loginId],
      externalIds: [loginId],
      userId: `user-${i}`,
      email,
      phone,
      name: displayName,
      roleNames: roles,
      customAttributes,
      picture,
      verifiedEmail,
      verifiedPhone,
      givenName,
      middleName,
      familyName,
      createdTime: new Date().getTime(),
      editable: true,
      password: true,
      SAML: false,
      status: 'enabled',
      test: false,
      TOTP: false,
      userTenants: [],
      webauthn: false,
    });
  });

const update: (config: UpdateUserConfig) => Promise<User> = async ({
  loginId,
  email,
  phone,
  displayName,
  roles,
  customAttributes,
  picture,
  verifiedEmail,
  verifiedPhone,
  givenName,
  middleName,
  familyName,
}) =>
  new Promise((resolve) => {
    resolve({
      loginIds: [loginId],
      externalIds: [loginId],
      userId: loginId,
      email,
      phone,
      name: displayName,
      roleNames: roles,
      customAttributes,
      picture,
      verifiedEmail,
      verifiedPhone,
      givenName,
      middleName,
      familyName,
      createdTime: new Date().getTime(),
      editable: true,
      password: true,
      SAML: false,
      status: 'enabled',
      test: false,
      TOTP: false,
      userTenants: [],
      webauthn: false,
    });
  });

const deleteBatch = async () => {};

const getCustomAttributes = async (): Promise<CustomAttr[]> =>
  new Promise((resolve) => {
    resolve([]);
  });

const setTempPassword = async () =>
  new Promise((resolve) => {
    resolve({
      cleartext: Math.random().toString(20).substring(2),
    });
  });

const removePasskey = async () => {};

const enable = async (loginId: string) =>
  new Promise((resolve) => {
    resolve({
      user: {
        loginIds: [loginId],
        status: 'enabled',
      },
    });
  });

const disable = async (loginId: string) =>
  new Promise((resolve) => {
    resolve({
      user: {
        loginIds: [loginId],
        status: 'disabled',
      },
    });
  });

const getTenantRoles = (
  tenant: string,
): Promise<{
  roles: Role[];
}> =>
  new Promise((resolve) => {
    const roles: Role[] = [];
    for (let i = 1; i < 5; i += 1) {
      roles.push({
        name: `Role ${i}`,
        description: `Role description ${i}`,
        createdTime: new Date(),
        permissionNames: [`Permission ${i}`],
        tenantId: tenant,
      });
    }
    resolve({ roles });
  });

const user = {
  search,
  create,
  update,
  deleteBatch,
  setTempPassword,
  removePasskey,
  enable,
  disable,
  getCustomAttributes,
};
const tenants = {
  getTenantRoles,
};
export { user, tenants };
