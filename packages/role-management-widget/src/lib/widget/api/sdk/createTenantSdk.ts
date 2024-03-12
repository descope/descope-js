import { HttpClient, Permission } from '../types';
import { apiPaths } from '../apiPaths';
import { withErrorHandler } from './helpers';

export const createTenantSdk = ({
  httpClient,
  tenant,
}: {
  httpClient: HttpClient;
  tenant: string;
}) => {
  const getTenantPermissions = async (): Promise<{
    permissions: Permission[];
  }> => {
    const res = await httpClient.get(apiPaths.tenant.permissions, {
      queryParams: { tenant },
    });

    await withErrorHandler(res);

    return res.json();
  };

  return {
    getTenantPermissions,
  };
};
