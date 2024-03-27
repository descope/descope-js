import {
  HttpClient,
  CreateAccessKeyConfig,
  SearchAccessKeyConfig,
  AccessKey,
} from '../types';
import { apiPaths } from '../apiPaths';
import { withErrorHandler } from './helpers';
import { accessKey } from './mocks';

export const createAccessKeySdk = ({
  httpClient,
  tenant,
  mock,
}: {
  httpClient: HttpClient;
  tenant: string;
  mock: boolean;
}) => {
  const search: (
    config: SearchAccessKeyConfig,
  ) => Promise<AccessKey[]> = async ({
    page,
    limit = 10000,
    text,
    sort,
  } = {}) => {
    if (mock) {
      return accessKey.search({ page, limit, text, sort });
    }

    const res = await httpClient.post(
      apiPaths.accesskey.search,
      {
        limit,
        page,
        text,
        sort,
      },
      {
        queryParams: { tenant },
      },
    );

    await withErrorHandler(res);

    const json = await res.json();

    return json.keys;
  };

  const deleteBatch = async (ids: string[]) => {
    if (mock) {
      return accessKey.deleteBatch();
    }
    const res = await httpClient.post(
      apiPaths.accesskey.deleteBatch,
      { ids },
      {
        queryParams: { tenant },
      },
    );

    await withErrorHandler(res);

    return res.json();
  };

  const create: (
    config: CreateAccessKeyConfig,
  ) => Promise<{ cleartext: string; key: AccessKey }> = async ({
    name,
    expiration,
    roleNames,
    userId,
  }) => {
    const expirationTime = new Date();
    expirationTime.setDate(expirationTime.getDate() + +expiration);
    const expireTime =
      expiration[0] === '0' ? 0 : Math.floor(expirationTime.getTime() / 1000);
    if (mock) {
      return accessKey.create(
        { name, expiration, roleNames, userId },
        expireTime,
      );
    }

    const res = await httpClient.post(
      apiPaths.accesskey.create,
      {
        name,
        expireTime,
        roleNames,
        userId,
      },
      {
        queryParams: { tenant },
      },
    );

    await withErrorHandler(res);

    const json = await res.json();

    return json;
  };

  const activate = async (ids: string[]) => {
    if (mock) {
      return accessKey.activate();
    }
    const res = await httpClient.post(
      apiPaths.accesskey.activate,
      {
        ids,
      },
      {
        queryParams: { tenant },
      },
    );

    await withErrorHandler(res);

    const json = await res.json();
    return json;
  };

  const deactivate = async (ids: string[]) => {
    if (mock) {
      return accessKey.deactivate();
    }
    const res = await httpClient.post(
      apiPaths.accesskey.deactivate,
      {
        ids,
      },
      {
        queryParams: { tenant },
      },
    );

    await withErrorHandler(res);

    const json = await res.json();
    return json;
  };

  return {
    search,
    deleteBatch,
    create,
    activate,
    deactivate,
  };
};
