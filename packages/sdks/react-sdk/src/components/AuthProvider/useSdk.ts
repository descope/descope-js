import { useMemo } from 'react';
import { baseHeaders } from '../../constants';
import createSdk from '../../sdk';

type Config = Pick<
  Parameters<typeof createSdk>[0],
  | 'projectId'
  | 'baseUrl'
  | 'persistTokens'
  | 'sessionTokenViaCookie'
  | 'storeLastAuthenticatedUser'
  | 'keepLastAuthenticatedUserAfterLogout'
> & {
  refreshCookieName?: string;
};

export default ({
  projectId,
  baseUrl,
  persistTokens,
  sessionTokenViaCookie,
  storeLastAuthenticatedUser,
  keepLastAuthenticatedUserAfterLogout,
  refreshCookieName,
}: Config): ReturnType<typeof createSdk> =>
  useMemo(() => {
    if (!projectId) {
      return undefined;
    }
    return createSdk({
      projectId,
      baseUrl,
      sessionTokenViaCookie,
      baseHeaders: {
        ...baseHeaders,
        ...(refreshCookieName && {
          'x-descope-refresh-cookie-name': refreshCookieName,
        }),
      },
      persistTokens,
      storeLastAuthenticatedUser,
      keepLastAuthenticatedUserAfterLogout,
      autoRefresh: true,
    });
  }, [projectId, baseUrl, sessionTokenViaCookie, refreshCookieName]);
