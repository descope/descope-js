import { HttpClient, Permission } from '../types';
import { apiPaths } from '../apiPaths';
import { withErrorHandler } from './helpers';
import { tenants } from './mocks';

export const createTenantSdk = ({
  httpClient,
  tenant,
  mock,
}: {
  httpClient: HttpClient;
  tenant: string;
  mock: boolean;
}) => {
  const getTenantPermissions = async (): Promise<{
    permissions: Permission[];
  }> => {
    if (mock) {
      return tenants.getTenantPermissions();
    }
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
