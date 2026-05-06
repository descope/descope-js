import { apiPaths } from '../apiPaths';
import { HttpClient, ListSsoConfigurationsResponse } from '../types';
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
  const tenantIdEncoded = encodeURIComponent(tenantId || '');
  const queryParams = `?tenant=${tenantIdEncoded}&id=${tenantIdEncoded}`;

  const details = async () => {
    if (mock) {
      return tenantMock.get();
    }
    if (!tenantId) throw new Error('tenantId is not defined');

    const url = `${apiPaths.tenant.details}${queryParams}`;
    const res = await httpClient.get(url);
    await withErrorHandler(res);
    const data = await res.json();
    return data;
  };

  const adminLinkSso = async () => {
    if (mock) {
      return tenantMock.getTenantAdminLinkSSO();
    }
    if (!tenantId) throw new Error('tenantId is not defined');

    const res = await httpClient.post(
      `${apiPaths.tenant.adminLinkSso}?tenant=${tenantIdEncoded}`,
      {
        tenantId: tenantIdEncoded,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
    await withErrorHandler(res);
    const data = await res.json();
    return data;
  };

  const listSsoConfigs = async (): Promise<ListSsoConfigurationsResponse> => {
    if (mock) {
      return tenantMock.listSsoConfigs();
    }
    if (!tenantId) throw new Error('tenantId is not defined');

    const res = await httpClient.get(
      `${apiPaths.tenant.ssoConfigurations}?tenant=${tenantIdEncoded}`,
    );
    await withErrorHandler(res);
    return res.json();
  };

  const createSsoConfig = async ({
    name,
    id,
  }: {
    name: string;
    id?: string;
  }) => {
    if (mock) {
      return tenantMock.createSsoConfig({ name, id });
    }
    if (!tenantId) throw new Error('tenantId is not defined');

    const res = await httpClient.post(
      `${apiPaths.tenant.ssoConfigurations}?tenant=${tenantIdEncoded}`,
      { name, ...(id && { id }) },
      { headers: { 'Content-Type': 'application/json' } },
    );
    await withErrorHandler(res);
    return res.json();
  };

  const deleteSsoConfig = async ({ id }: { id: string }) => {
    if (mock) {
      return tenantMock.deleteSsoConfig({ id });
    }
    if (!tenantId) throw new Error('tenantId is not defined');

    const res = await httpClient.delete(
      `${apiPaths.tenant.ssoConfigurations}/${encodeURIComponent(id)}?tenant=${tenantIdEncoded}`,
    );
    await withErrorHandler(res);
  };

  return {
    details,
    adminLinkSso,
    listSsoConfigs,
    createSsoConfig,
    deleteSsoConfig,
  };
};
