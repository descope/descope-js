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
  | 'getExternalToken'
  | 'logger'
  | 'hooks'
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
  logger,
  hooks,
  getExternalToken,
}: Config): ReturnType<typeof createSdk> =>
  useMemo(() => {
    if (!projectId) {
      return undefined;
    }
    return createSdk({
      logger,
      hooks,
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
      getExternalToken,
    });
  }, [projectId, baseUrl, sessionTokenViaCookie, getExternalToken]);
