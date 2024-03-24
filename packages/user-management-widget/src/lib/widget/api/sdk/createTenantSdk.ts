import { HttpClient, Role } from '../types';
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
  const getTenantRoles = async (): Promise<{ roles: Role[] }> => {
    if (mock) {
      return tenants.getTenantRoles(tenant);
    }
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
