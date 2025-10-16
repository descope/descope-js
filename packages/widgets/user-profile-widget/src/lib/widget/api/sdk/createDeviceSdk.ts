import { apiPaths } from '../apiPaths';
import { HttpClient } from '../types';
import { withErrorHandler } from './helpers';
import { user } from './mocks';

export const createDeviceSdk = ({
  httpClient,
  mock,
}: {
  httpClient: HttpClient;
  mock: boolean;
}) => {
  const devices = async ({ userId }: { userId: string }) => {
    if (mock) {
      return user.devices();
    }
    const res = await httpClient.post(apiPaths.user.devices, {
      identifiers: [userId],
    });

    await withErrorHandler(res);

    return res.json();
  };

  return {
    devices,
  };
};
