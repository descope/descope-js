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
  | 'oidcConfig'
  | 'keepLastAuthenticatedUserAfterLogout'
  | 'refreshCookieName'
>;

export default ({
  projectId,
  baseUrl,
  persistTokens,
  sessionTokenViaCookie,
  refreshCookieName,
  oidcConfig,
  storeLastAuthenticatedUser,
  keepLastAuthenticatedUserAfterLogout,
}: Config): ReturnType<typeof createSdk> =>
  useMemo(() => {
    if (!projectId) {
      return undefined;
    }
    return createSdk({
      projectId,
      baseUrl,
      sessionTokenViaCookie,
      baseHeaders,
      persistTokens,
      refreshCookieName,
      oidcConfig,
      storeLastAuthenticatedUser,
      keepLastAuthenticatedUserAfterLogout,
      autoRefresh: true,
    });
  }, [projectId, baseUrl, sessionTokenViaCookie]);
