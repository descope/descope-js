import {
  CreateUserConfig,
  HttpClient,
  SearchUsersConfig,
  UpdateUserConfig,
  User,
  CustomAttr,
} from '../types';
import { apiPaths } from '../apiPaths';
import { withErrorHandler } from './helpers';
import { user } from './mocks';

export const createUserSdk = ({
  httpClient,
  tenant,
  mock,
}: {
  httpClient: HttpClient;
  tenant: string;
  mock: boolean;
}) => {
  const search: (config: SearchUsersConfig) => Promise<User[]> = async ({
    page,
    limit = 10000,
    customAttributes,
    statuses,
    emails,
    phones,
    text,
    sort,
  } = {}) => {
    if (mock) {
      return user.search({
        page,
        limit,
        customAttributes,
        statuses,
        emails,
        phones,
        text,
        sort,
      });
    }
    const res = await httpClient.post(
      apiPaths.user.search,
      {
        limit,
        page,
        withTestUser: false,
        customAttributes,
        statuses,
        emails,
        phones,
        text,
        sort,
      },
      {
        queryParams: { tenant },
      },
    );

    await withErrorHandler(res);

    const json = await res.json();

    return json.users;
  };

  const deleteBatch = async (userIds: string[]) => {
    if (mock) {
      return user.deleteBatch();
    }
    const res = await httpClient.post(
      apiPaths.user.deleteBatch,
      { userIds },
      {
        queryParams: { tenant },
      },
    );

    await withErrorHandler(res);

    return res.json();
  };

  const create: (config: CreateUserConfig) => Promise<User[]> = async ({
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
    additionalLoginIds,
    sendSMS,
    sendMail,
    inviteUrl,
    invite,
  }) => {
    if (mock) {
      return user.create({
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
        additionalLoginIds,
        sendSMS,
        sendMail,
        inviteUrl,
        invite,
      });
    }
    const res = await httpClient.post(
      apiPaths.user.create,
      {
        loginId,
        email,
        phone,
        displayName,
        givenName,
        middleName,
        familyName,
        roleNames: roles,
        userTenants: [{ tenantId: tenant }],
        customAttributes,
        picture,
        verifiedEmail,
        verifiedPhone,
        additionalLoginIds,
        sendSMS,
        sendMail,
        inviteUrl,
        invite,
      },
      {
        queryParams: { tenant },
      },
    );

    await withErrorHandler(res);

    const json = await res.json();

    return json.user;
  };

  const update: (config: UpdateUserConfig) => Promise<User[]> = async ({
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
    additionalLoginIds,
  }) => {
    if (mock) {
      return user.update({
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
        additionalLoginIds,
      });
    }
    const res = await httpClient.post(
      apiPaths.user.update,
      {
        loginId,
        email,
        phone,
        displayName,
        givenName,
        middleName,
        familyName,
        roleNames: roles,
        customAttributes,
        picture,
        verifiedEmail,
        verifiedPhone,
        additionalLoginIds,
      },
      {
        queryParams: { tenant },
      },
    );

    await withErrorHandler(res);

    const json = await res.json();

    return json.user;
  };

  const setTempPassword = async (loginId: string) => {
    if (mock) {
      return user.setTempPassword();
    }
    const res = await httpClient.post(
      apiPaths.user.setTempPassword,
      {
        loginId,
      },
      {
        queryParams: { tenant },
      },
    );

    await withErrorHandler(res);

    return res.json();
  };

  const removePasskey = async (loginId: string) => {
    if (mock) {
      return user.removePasskey();
    }
    const res = await httpClient.post(
      apiPaths.user.removePasskey,
      { loginId },
      {
        queryParams: { tenant },
      },
    );

    await withErrorHandler(res);

    return res.json();
  };

  const enable = async (loginId: string) => {
    if (mock) {
      return user.enable(loginId);
    }
    const res = await httpClient.post(
      apiPaths.user.status,
      { loginId, status: 'enabled' },
      {
        queryParams: { tenant },
      },
    );

    await withErrorHandler(res);

    return res.json();
  };

  const disable = async (loginId: string) => {
    if (mock) {
      return user.disable(loginId);
    }
    const res = await httpClient.post(
      apiPaths.user.status,
      { loginId, status: 'disabled' },
      {
        queryParams: { tenant },
      },
    );

    await withErrorHandler(res);

    return res.json();
  };

  const getCustomAttributes = async (): Promise<CustomAttr[]> => {
    if (mock) {
      return user.getCustomAttributes();
    }
    const res = await httpClient.get(apiPaths.user.customAttributes, {
      queryParams: { tenant },
    });

    await withErrorHandler(res);

    const json = await res.json();

    return json.data;
  };

  return {
    search,
    deleteBatch,
    create,
    update,
    enable,
    disable,
    removePasskey,
    setTempPassword,
    getCustomAttributes,
  };
};
