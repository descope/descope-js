import { apiPaths } from '../apiPaths';
import { HttpClient } from '../types';
import { withErrorHandler } from './helpers';
import { ssoApps } from './mocks';

export const createSsoAppsSdk = ({
  httpClient,
  mock,
}: {
  httpClient: HttpClient;
  mock: boolean;
}) => {
  const load = async () => {
    if (mock) {
      return ssoApps.load();
    }
    const res = await httpClient.get(apiPaths.ssoApps.load);

    await withErrorHandler(res);

    return res.json();
  };

  return {
    load,
  };
};
