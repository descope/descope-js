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
  | 'storeLastAuthenticatedUser'
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
  refreshCookieName,
  oidcConfig,
  storeLastAuthenticatedUser,
  keepLastAuthenticatedUserAfterLogout,
  getExternalToken,
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
      baseHeaders,
      persistTokens,
      autoRefresh,
      refreshCookieName,
      oidcConfig,
      storeLastAuthenticatedUser,
      keepLastAuthenticatedUserAfterLogout,
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
    getExternalToken,
    customStorage,
  ]);
