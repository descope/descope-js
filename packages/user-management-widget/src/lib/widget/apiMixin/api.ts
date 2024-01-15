import createWebSdk from '@descope/web-js-sdk';
import { CreateUser, SearchUsers } from './types';
import { apiPaths } from './apiPaths';

export const createSdk = (config: Parameters<typeof createWebSdk>[0], managementKey: string, tenant: string) => {
  const webSdk = createWebSdk(config);

  const search: SearchUsers = async ({
    page,
    limit = 10000,
    customAttributes,
    statuses,
    emails,
    phones,
  } = {}) => {
    const res = await webSdk.httpClient.post(
      apiPaths.user.search,
      {
        limit,
        page,
        withTestUser: false,
        customAttributes,
        statuses,
        emails,
        phones,
      },
      {
        token: managementKey,
        queryParams: { tenant }
      },
    );

    if (!res.ok) {
      throw Error(res.statusText);
    }

    const json = await res.json();

    return json.users;
  };

  const del = async (loginIds: string[]) => {
    const res = await webSdk.httpClient.post(
      apiPaths.user.delete,
      { loginId: loginIds[0] },
      {
        token: managementKey,
        queryParams: { tenant }
      });

    if (!res.ok) {
      throw Error(res.statusText);
    }

    return res.json();
  };

  const create: CreateUser = async ({
    loginId,
    email,
    phone,
    displayName,
    roles,
    userTenants,
    customAttributes,
    picture,
    verifiedEmail,
    verifiedPhone,
    givenName,
    middleName,
    familyName,
    additionalLoginIds,
  }) => {
    const res = await webSdk.httpClient.post(
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
        userTenants,
        customAttributes,
        picture,
        verifiedEmail,
        verifiedPhone,
        additionalLoginIds,
      },
      {
        token: managementKey,
        queryParams: { tenant }
      },
    );

    if (!res.ok) {
      throw Error(res.statusText);
    }

    const json = await res.json();

    return json.user;
  };


  const expirePassword = async (loginIds: string[]) => {
    const res = await webSdk.httpClient.post(
      apiPaths.user.expirePassword,
      { loginId: loginIds[0] },
      {
        token: managementKey,
        queryParams: { tenant }
      });

    if (!res.ok) {
      throw Error(res.statusText);
    }

    return res.json();
  };

  return {
    user: {
      search,
      delete: del,
      create,
      expirePassword
    }
  };
};

export type Api = ReturnType<typeof createSdk>
