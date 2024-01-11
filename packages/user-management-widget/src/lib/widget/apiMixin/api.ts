import createWebSdk from '@descope/web-js-sdk';
import { CreateUser, SearchUsers } from './types';
import { apiPaths } from './apiPaths';

// TODO: error handling
export const createSdk = (config: Parameters<typeof createWebSdk>[0], managementKey: string) => {
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
      { token: managementKey },
    );

    if (!res.ok) {
      throw Error(res.statusText);
    }

    const json = await res.json();

    return json.users;
  };

  const del = async (loginIds: string[]) => {
    const res = await webSdk.httpClient.post(apiPaths.user.delete, { loginId: loginIds[0] }, { token: managementKey });

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
      { token: managementKey },
    );

    if (!res.ok) {
      throw Error(res.statusText);
    }

    const json = await res.json();

    return json.user;
  };

  return {
    user: {
      search,
      delete: del,
      create
    }
  };
};

export type Api = ReturnType<typeof createSdk>


// get custom attributes and show it in the table
// add sorting capability
// edit user? yael
// displayed vs total num of users
// in case total > displayed, we should fetch users from the server for sort & filter
// data & header in the table should use text component
