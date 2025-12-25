import {
  CreateUserConfig,
  CustomAttr,
  Role,
  SearchUsersConfig,
  UpdateUserConfig,
  User,
} from '../types';

const compareValues = (a: any, b: any, desc: boolean) => {
  // Handle boolean values by converting to numeric for proper comparison
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    const aNum = a ? 1 : 0;
    const bNum = b ? 1 : 0;
    // reverse `desc` to prefer true over false when ascending
    return !desc ? bNum - aNum : aNum - bNum;
  }

  const aStr = a?.toString() || '';
  const bStr = b?.toString() || '';
  return desc ? bStr.localeCompare(aStr) : aStr.localeCompare(bStr);
};

const search: (config: SearchUsersConfig) => Promise<User[]> = async ({
  text,
  sort,
}) =>
  new Promise((resolve) => {
    const users: User[] = [];
    const timeMock = new Date().getTime();
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
        createdTime: timeMock,
        createdTimeFormatted: new Date((timeMock || 0) * 1000).toLocaleString(),
        customAttributes: {},
        familyName: '',
        givenName: '',
        middleName: '',
        picture: '',
        password: true,
        SAML: i % 3 === 0,
        OIDC: i % 3 === 1,
        SCIM: i % 3 === 2,
        test: false,
        TOTP: false,
        webauthn: false,
      });
    }
    sort.forEach((s) => {
      users.sort((a, b) => compareValues(a[s.field], b[s.field], s.desc));
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
      SCIM: false,
      OIDC: false,
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
      SCIM: false,
      OIDC: false,
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
