import {
  CreateRoleConfig,
  HttpClient,
  SearchRolesConfig,
  UpdateRoleConfig,
  Role,
} from '../types';
import { apiPaths } from '../apiPaths';
import { withErrorHandler } from './helpers';
import { role } from './mocks';

export const createRoleSdk = ({
  httpClient,
  tenant,
  mock,
}: {
  httpClient: HttpClient;
  tenant: string;
  mock: string;
}) => {
  const search: (config: SearchRolesConfig) => Promise<Role[]> = async ({
    page,
    limit = 10000,
    text,
    sort,
  } = {}) => {
    if (mock) {
      return role.search({ page, limit, text, sort }, tenant);
    }
    const res = await httpClient.post(
      apiPaths.role.search,
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

    return json.roles;
  };

  const deleteBatch = async (roleNames: string[]) => {
    if (mock) {
      return role.deleteBatch();
    }
    const res = await httpClient.post(
      apiPaths.role.deleteBatch,
      { roleNames },
      {
        queryParams: { tenant },
      },
    );

    await withErrorHandler(res);

    return res.json();
  };

  const create: (config: CreateRoleConfig) => Promise<Role[]> = async ({
    name,
    description,
    permissionNames,
  }) => {
    if (mock) {
      return role.create({ name, description, permissionNames }, tenant);
    }
    const res = await httpClient.post(
      apiPaths.role.create,
      {
        name,
        description,
        permissionNames,
        tenantId: tenant,
      },
      {
        queryParams: { tenant },
      },
    );

    await withErrorHandler(res);

    const json = await res.json();

    return json;
  };

  const update: (config: UpdateRoleConfig) => Promise<Role[]> = async ({
    name,
    newName,
    description,
    permissionNames,
  }) => {
    if (mock) {
      return role.update(
        { name, newName, description, permissionNames },
        tenant,
      );
    }
    const res = await httpClient.post(
      apiPaths.role.update,
      {
        name,
        newName,
        description,
        permissionNames,
        tenantId: tenant,
      },
      {
        queryParams: { tenant },
      },
    );

    await withErrorHandler(res);

    const json = await res.json();
    json.oldName = name;
    return json;
  };

  return {
    search,
    deleteBatch,
    create,
    update,
  };
};
