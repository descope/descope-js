import { apiPaths } from '../apiPaths';
import { HttpClient, User } from '../types';
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
    const res = await httpClient.get(apiPaths.outboundApps.allOutboundApps);

    await withErrorHandler(res);

    return res.json();
  };

  const getConnectedOutboundApps = async ({ userId }: User) => {
    if (mock) {
      return outboundApps.getConnectedOutboundApps();
    }

    const res = await httpClient.get(
      apiPaths.outboundApps.connectedOutboundApps,
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
