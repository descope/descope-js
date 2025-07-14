import { apiPaths } from '../apiPaths';
import { HttpClient } from '../types';
import { withErrorHandler } from './helpers';
import { outboundApps } from './mocks';

export const createOutboundAppsSdk = ({
  httpClient,
  mock,
}: {
  httpClient: HttpClient;
  mock: boolean;
  userId?: string;
}) => {
  const getAllOutboundApps = async () => {
    if (mock) {
      return outboundApps.getAllOutboundApps();
    }
    const res = await httpClient.get(apiPaths.outboundApps.getAllOutboundApps);

    await withErrorHandler(res);

    return res.json();
  };

  const getConnectedOutboundApps = async ({ userId }) => {
    if (mock) {
      return outboundApps.getConnectedOutboundApps();
    }

    const res = await httpClient.get(
      apiPaths.outboundApps.getConnectedOutboundApps,
      {
        queryParams: { userId },
      },
    );

    await withErrorHandler(res);

    return res.json();
  };

  return {
    getAllOutboundApps,
    getConnectedOutboundApps,
  };
};
