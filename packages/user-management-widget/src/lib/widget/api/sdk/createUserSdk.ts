import { CreateUser, HttpClient, SearchUsers } from '../types';
import { apiPaths } from '../apiPaths';

export const createUserSdk = ({ httpClient, tenant }: { httpClient: HttpClient, tenant: string }) => {

  const search: SearchUsers = async ({
    page,
    limit = 10000,
    customAttributes,
    statuses,
    emails,
    phones,
    text
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
        text
      },
      {
        queryParams: { tenant }
      },
    );

    if (!res.ok) {
      throw Error(`Fetch failed: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();

    return json.users;
  };

  const deleteBatch = async (userIds: string[]) => {
    const res = await httpClient.post(
      apiPaths.user.deleteBatch,
      { userIds },
      {
        queryParams: { tenant }
      });

    if (!res.ok) {
      throw Error(`Fetch failed: ${res.status} ${res.statusText}`);
    }

    return res.json();
  };

  const create: CreateUser = async ({
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
      },
      {
        queryParams: { tenant }
      },
    );

    if (!res.ok) {
      throw Error(`Fetch failed: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();

    return json.user;
  };

  const expirePassword = async (loginIds: string[]) => {
    const res = await httpClient.post(
      apiPaths.user.expirePassword,
      { loginId: loginIds[0] },
      {
        queryParams: { tenant }
      });

    if (!res.ok) {
      throw Error(`Fetch failed: ${res.status} ${res.statusText}`);
    }

    return res.json();
  };

  const getCustomAttributes = async () => {
    const res = await httpClient.get(
      apiPaths.user.customAttributes,
      {
        queryParams: { tenant }
      });

    if (!res.ok) {
      throw Error(`Fetch failed: ${res.status} ${res.statusText}`);
    }

    return res.json();
  };

  return {
    search,
    deleteBatch,
    create,
    expirePassword,
    getCustomAttributes
  };
};
