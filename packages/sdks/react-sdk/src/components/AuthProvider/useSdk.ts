import { useMemo } from 'react';
import { baseHeaders } from '../../constants';
import createSdk from '../../sdk';

type Config = Pick<
  Parameters<typeof createSdk>[0],
  | 'projectId'
  | 'baseUrl'
  | 'persistTokens'
  | 'autoRefresh'
  | 'sessionTokenViaCookie'
  | 'refreshTokenViaCookie'
  | 'storeLastAuthenticatedUser'
  | 'hooks'
  | 'oidcConfig'
  | 'keepLastAuthenticatedUserAfterLogout'
  | 'refreshCookieName'
  | 'getExternalToken'
  | 'customStorage'
>;

export default ({
  projectId,
  baseUrl,
  persistTokens,
  autoRefresh,
  sessionTokenViaCookie,
  refreshTokenViaCookie,
  refreshCookieName,
  oidcConfig,
  storeLastAuthenticatedUser,
  keepLastAuthenticatedUserAfterLogout,
  getExternalToken,
  hooks,
  customStorage,
}: Config): ReturnType<typeof createSdk> =>
  useMemo(() => {
    if (!projectId) {
      return undefined;
    }
    return createSdk({
      projectId,
      baseUrl,
      sessionTokenViaCookie,
      refreshTokenViaCookie,
      baseHeaders,
      persistTokens,
      autoRefresh,
      refreshCookieName,
      oidcConfig,
      storeLastAuthenticatedUser,
      keepLastAuthenticatedUserAfterLogout,
      hooks,
      getExternalToken,
      customStorage,
    });
  }, [
    projectId,
    baseUrl,
    // NOTE: Avoid creating another instance of the SDK if the consumer of this
    // component forgot to `useMemo` the object.
    // This is also necessary for a workaround with Next.js SSR when including AuthProvider
    // in RootLayout with another component that forces rerenders.
    //
    // See: https://github.com/descope/etc/issues/11965
    JSON.stringify(sessionTokenViaCookie),
    JSON.stringify(refreshTokenViaCookie),
    getExternalToken,
    customStorage,
  ]);
