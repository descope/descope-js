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
    me,
    devices,
  };
};
