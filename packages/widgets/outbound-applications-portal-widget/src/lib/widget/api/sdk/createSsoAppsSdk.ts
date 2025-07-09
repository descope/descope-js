import { apiPaths } from '../apiPaths';
import { HttpClient } from '../types';
import { withErrorHandler } from './helpers';
import { outboundApps } from './mocks';

export const createSsoAppsSdk = ({
  httpClient,
  mock,
}: {
  httpClient: HttpClient;
  mock: boolean;
}) => {
  const load = async () => {
    if (mock) {
      return outboundApps.load();
    }
    const res = await httpClient.get(apiPaths.outboundApps.load);

    await withErrorHandler(res);

    return res.json();
  };

  return {
    load,
  };
};
