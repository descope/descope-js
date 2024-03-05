import {
  CreateUserConfig,
  HttpClient,
  SearchUsersConfig,
  UpdateUserConfig,
  User,
} from '../types';
import { apiPaths } from '../apiPaths';
import { withErrorHandler } from './helpers';

export const createUserSdk = ({
  httpClient,
  tenant,
}: {
  httpClient: HttpClient;
  tenant: string;
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

  const expirePassword = async (loginIds: string[]) => {
    const res = await httpClient.post(
      apiPaths.user.expirePassword,
      { loginId: loginIds[0] },
      {
        queryParams: { tenant },
      },
    );

    await withErrorHandler(res);

    return res.json();
  };

  const enable = async (loginIds: string[]) => {
    const res = await httpClient.post(
      apiPaths.user.enable,
      { loginId: loginIds[0], status: 'enabled' },
      {
        queryParams: { tenant },
      },
    );

    await withErrorHandler(res);

    return res.json();
  };

  const disable = async (loginIds: string[]) => {
    const res = await httpClient.post(
      apiPaths.user.enable,
      { loginId: loginIds[0], status: 'disabled' },
      {
        queryParams: { tenant },
      },
    );

    await withErrorHandler(res);

    return res.json();
  };

  const getCustomAttributes = async () => {
    const res = await httpClient.get(apiPaths.user.customAttributes, {
      queryParams: { tenant },
    });

    await withErrorHandler(res);

    return res.json();
  };

  return {
    search,
    deleteBatch,
    create,
    update,
    enable,
    disable,
    expirePassword,
    getCustomAttributes,
  };
};
