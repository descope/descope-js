import { apiPaths } from '../apiPaths';
import { HttpClient } from '../types';
import { withErrorHandler } from './helpers';
import { user } from './mocks';

export const createUserSdk = ({
  httpClient,
  mock,
}: {
  httpClient: HttpClient;
  mock: boolean;
}) => {
  const me = async () => {
    if (mock) {
      return user.me();
    }
    const res = await httpClient.get(apiPaths.user.me);

    await withErrorHandler(res);

    return res.json();
  };

  const setCurrentTenant = async (tenantId: string) => {
    const res = await httpClient.post(apiPaths.user.selectTenant, {
      tenant: tenantId,
    });

    await withErrorHandler(res);

    return res.json();
  };

  return {
    me,
    setCurrentTenant,
  };
};
