import { HttpClient, Role } from '../types';
import { apiPaths } from '../apiPaths';
import { withErrorHandler } from './helpers';

export const createTenantSdk = ({
  httpClient,
  tenant,
}: {
  httpClient: HttpClient;
  tenant: string;
}) => {
  const getTenantRoles = async (): Promise<{roles: Role[]}> => {
    const res = await httpClient.get(apiPaths.tenant.roles, {
      queryParams: { tenant },
    });

    await withErrorHandler(res);

    return res.json();
  };

  return {
    getTenantRoles,
  };
};
