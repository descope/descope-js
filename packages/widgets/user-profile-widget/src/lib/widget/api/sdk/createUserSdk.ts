import { apiPaths } from '../apiPaths';
import { CustomAttr, HttpClient } from '../types';
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

  const getCustomAttributes = async (): Promise<CustomAttr[]> => {
    if (mock) {
      return [];
    }
    const res = await httpClient.get(apiPaths.user.customAttributes);

    await withErrorHandler(res);

    const json = await res.json();

    return json.data;
  };

  return {
    me,
    getCustomAttributes,
  };
};
