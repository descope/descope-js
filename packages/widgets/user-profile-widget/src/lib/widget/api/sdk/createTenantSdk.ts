import { apiPaths } from '../apiPaths';
import { HttpClient } from '../types';
import { withErrorHandler } from './helpers';

export const createTenantSdk = ({
  httpClient,
  mock,
}: {
  httpClient: HttpClient;
  mock: boolean;
}) => {
  const selectTenant = async (tenantId: string) => {
    const res = await httpClient.post(apiPaths.user.selectTenant, {
      tenant: tenantId,
    });

    await withErrorHandler(res);

    return res.json();
  };

  return {
    selectTenant,
  };
};
