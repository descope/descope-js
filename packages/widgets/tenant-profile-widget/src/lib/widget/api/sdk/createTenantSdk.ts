import { apiPaths } from '../apiPaths';
import { HttpClient } from '../types';
import { withErrorHandler } from './helpers';
import { tenantMock } from './mocks';

export const createTenantSdk = ({
  httpClient,
  tenantId,
  mock,
}: {
  httpClient: HttpClient;
  tenantId?: string;
  mock: boolean;
}) => {
  const queryParams = `?tenant=${encodeURIComponent(
    tenantId,
  )}&id=${encodeURIComponent(tenantId)}`;

  const get = async () => {
    if (mock) {
      return tenantMock.get();
    }
    if (!tenantId) throw new Error('tenantId is not defined');

    const url = `${apiPaths.tenant.get}${queryParams}`;
    const res = await httpClient.get(url);
    await withErrorHandler(res);
    const data = await res.json();
    return data;
  };

  return {
    get,
  };
};
