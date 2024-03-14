import {
  HttpClient,
  CreateAccessKeyConfig,
  SearchAccessKeyConfig,
  AccessKey,
} from '../types';
import { apiPaths } from '../apiPaths';
import { withErrorHandler } from './helpers';

export const createAccessKeySdk = ({
  httpClient,
  tenant,
}: {
  httpClient: HttpClient;
  tenant: string;
}) => {
  const search: (
    config: SearchAccessKeyConfig,
  ) => Promise<AccessKey[]> = async ({
    page,
    limit = 10000,
    text,
    sort,
  } = {}) => {
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
  ) => Promise<AccessKey[]> = async ({
    name,
    expiration,
    roleNames,
    userId,
  }) => {
    const expireTime = new Date();
    expireTime.setDate(expireTime.getDate() + +expiration[0]);
    const res = await httpClient.post(
      apiPaths.accesskey.create,
      {
        name,
        expireTime:
          expiration[0] === '0' ? 0 : Math.floor(expireTime.getTime() / 1000),
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
