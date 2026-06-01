import { apiPaths } from '../apiPaths';
import { HttpClient } from '../types';
import { withErrorHandler } from './helpers';
import { user } from './mocks';

export const createPasskeySdk = ({
  httpClient,
  mock,
}: {
  httpClient: HttpClient;
  mock: boolean;
}) => {
  const listPasskeys = async ({ userId }: { userId: string }) => {
    if (mock) {
      return user.passkeys();
    }
    const res = await httpClient.post(apiPaths.user.passkeys, {
      loginId: userId,
    });

    await withErrorHandler(res);

    return res.json();
  };

  return {
    listPasskeys,
  };
};
