import { HttpClient, SearchAuditConfig, Audit } from '../types';
import { apiPaths } from '../apiPaths';
import { withErrorHandler } from './helpers';
import { audit } from './mocks';

export const createAuditSdk = ({
  httpClient,
  tenant,
  mock,
}: {
  httpClient: HttpClient;
  tenant: string;
  mock: boolean;
}) => {
  const search: (config: SearchAuditConfig) => Promise<Audit[]> = async ({
    page,
    limit = 10000,
    text,
    sort,
    from,
  } = {}) => {
    if (mock) {
      return audit.search({ page, limit, text, sort }, tenant);
    }
    const res = await httpClient.post(
      apiPaths.audit.search,
      {
        limit,
        page,
        text,
        sort,
        from,
      },
      {
        queryParams: { tenant },
      },
    );

    await withErrorHandler(res);

    const json = await res.json();

    return json.audits;
  };

  return {
    search,
  };
};
