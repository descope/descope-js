import {
  createContext,
  createSignal,
  onMount,
  onCleanup,
  type ParentComponent,
  createEffect,
} from 'solid-js';
import { isServer } from 'solid-js/web';
import type { DescopeProviderProps, AuthContextValue } from './types';
import createSdkInstance, { setGlobalSdk } from './sdk';
import { isDescopeBridge } from './utils';

export const DescopeContext = createContext<AuthContextValue>();

export const DescopeProvider: ParentComponent<DescopeProviderProps> = (
  props,
) => {
  const [user, setUser] = createSignal();
  const [session, setSession] = createSignal<string>();
  const [claims, setClaims] = createSignal();
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [isSessionLoading, setIsSessionLoading] = createSignal(false);
  const [isUserLoading, setIsUserLoading] = createSignal(false);
  const [isOidcLoading, setIsOidcLoading] = createSignal(!!props.oidcConfig);

  const sdk = createSdkInstance({
    projectId: props.projectId,
    baseUrl: props.baseUrl,
    persistTokens: props.persistTokens ?? true,
    autoRefresh: props.autoRefresh ?? true,
    sessionTokenViaCookie: props.sessionTokenViaCookie ?? false,
    refreshTokenViaCookie: props.refreshTokenViaCookie ?? false,
    oidcConfig: props.oidcConfig,
    storeLastAuthenticatedUser: props.storeLastAuthenticatedUser ?? true,
    keepLastAuthenticatedUserAfterLogout:
      props.keepLastAuthenticatedUserAfterLogout ?? false,
    refreshCookieName: props.refreshCookieName,
    getExternalToken: props.getExternalToken,
    customStorage: props.customStorage,
  });

  setGlobalSdk(sdk);

  let isSessionFetched = false;
  let isUserFetched = false;
  let isOidcFinishedLogin = false;

  onMount(() => {
    if (isServer) return;

    const unsubscribeSession = sdk.onSessionTokenChange(setSession);
    const unsubscribeUser = sdk.onUserChange(setUser);
    const unsubscribeAuth = sdk.onIsAuthenticatedChange(setIsAuthenticated);
    const unsubscribeClaims = sdk.onClaimsChange(setClaims);

    onCleanup(() => {
      unsubscribeSession();
      unsubscribeUser();
      unsubscribeAuth();
      unsubscribeClaims();
    });

    if (props.oidcConfig && !isOidcFinishedLogin) {
      isOidcFinishedLogin = true;
      sdk.oidc.finishLoginIfNeed().finally(() => {
        setIsOidcLoading(false);
        isSessionFetched = true;
      });
    }
  });

  const fetchSession = () => {
    if (isDescopeBridge()) return;
    if (isSessionFetched) return;
    isSessionFetched = true;

    setIsSessionLoading(true);
    sdk.refresh(undefined, true).finally(() => {
      setIsSessionLoading(false);
    });
  };

  const fetchUser = () => {
    if (isUserFetched) return;
    isUserFetched = true;

    setIsUserLoading(true);
    sdk.me().finally(() => {
      setIsUserLoading(false);
    });
  };

  const contextValue: AuthContextValue = {
    user,
    session,
    claims,
    isAuthenticated,
    isSessionLoading,
    isUserLoading,
    isOidcLoading,
    sdk,
    fetchSession,
    fetchUser,
    projectId: props.projectId,
    baseUrl: props.baseUrl,
    baseStaticUrl: props.baseStaticUrl,
    baseCdnUrl: props.baseCdnUrl,
    storeLastAuthenticatedUser: props.storeLastAuthenticatedUser,
    keepLastAuthenticatedUserAfterLogout:
      props.keepLastAuthenticatedUserAfterLogout,
    refreshCookieName: props.refreshCookieName,
    customStorage: props.customStorage,
  };

  return (
    <DescopeContext.Provider value={contextValue}>
      {props.children}
    </DescopeContext.Provider>
  );
};
