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
  | 'getExternalAccessToken'
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
  getExternalAccessToken,
}: Config): ReturnType<typeof createSdk> =>
  useMemo(() => {
    if (!projectId) {
      return undefined;
    }
    console.log('@@@ useSdk with', {
      getExternalAccessToken
    })
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
      getExternalAccessToken,
    });
  }, [projectId, baseUrl, sessionTokenViaCookie, getExternalAccessToken]);
