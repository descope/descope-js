import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CookieConfig, OidcConfig } from '@descope/web-js-sdk';
import { Claims } from '@descope/core-js-sdk';
import Context from '../../hooks/Context';
import { IContext, User } from '../../types';
import { withValidation } from '../../utils';
import useSdk from './useSdk';

interface IAuthProviderProps {
  projectId: string;
  baseUrl?: string;
  // allows to override the base URL that is used to fetch static files
  baseStaticUrl?: string;
  // allows to override the base URL that is used to fetch external script files
  baseCdnUrl?: string;
  // Default is true. If true, tokens will be stored on local storage and can accessed with getToken function
  persistTokens?: boolean;
  // Default is true. If true, the SDK will automatically refresh the session token when it is about to expire
  autoRefresh?: boolean;
  // If true, session token (jwt) will be stored on cookie. Otherwise, the session token will be
  // stored on local storage and can accessed with getSessionToken function
  // Use this option if session token will stay small (less than 1k)
  // NOTE: Session token can grow, especially in cases of using authorization, or adding custom claims
  sessionTokenViaCookie?: CookieConfig;
  // If truthy he SDK refresh and logout functions will use the OIDC client
  // Accepts boolean or OIDC configuration
  oidcConfig?: OidcConfig;
  // Default is true. If true, last authenticated user will be stored on local storage and can accessed with getUser function
  storeLastAuthenticatedUser?: boolean;
  // If true, last authenticated user will not be removed after logout
  keepLastAuthenticatedUserAfterLogout?: boolean;
  // Use this option if the authentication is done via cookie, and configured with a different name
  // Currently, this is done using Descope Flows
  refreshCookieName?: string;
  // Function to get external token, for seamless migration from external system
  getExternalToken?: () => Promise<string>;
  children?: React.ReactNode;
}

const AuthProvider: FC<IAuthProviderProps> = ({
  projectId,
  baseUrl = '',
  baseStaticUrl = '',
  baseCdnUrl = '',
  sessionTokenViaCookie = false,
  persistTokens = true,
  autoRefresh = true,
  oidcConfig = undefined,
  storeLastAuthenticatedUser = true,
  keepLastAuthenticatedUserAfterLogout = false,
  refreshCookieName = '',
  getExternalToken = undefined,
  children = undefined,
}) => {
  const [user, setUser] = useState<User>();
  const [session, setSession] = useState<string>();
  const [claims, setClaims] = useState<Claims>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  const oidcFinishLoginOnce = useRef(false);

  const sdk = useSdk({
    projectId,
    baseUrl,
    persistTokens,
    autoRefresh,
    sessionTokenViaCookie,
    oidcConfig,
    storeLastAuthenticatedUser,
    keepLastAuthenticatedUserAfterLogout,
    refreshCookieName,
    getExternalToken,
  });

  useEffect(() => {
    if (sdk) {
      const unsubscribeSessionToken = sdk.onSessionTokenChange(setSession);
      const unsubscribeUser = sdk.onUserChange(setUser);
      const unsubscribeIsAuthenticated =
        sdk.onIsAuthenticatedChange(setIsAuthenticated);
      const unsubscribeClaims = sdk.onClaimsChange(setClaims);

      return () => {
        unsubscribeSessionToken();
        unsubscribeUser();
        unsubscribeIsAuthenticated();
        unsubscribeClaims();
      };
    }
    return undefined;
  }, [sdk]);

  const sessionFetchedOnce = useRef(false);
  const userFetchedOnce = useRef(false);

  // if oidc config is enabled, and we have oidc params in the url
  // we will finish the login (this should run only once)
  useEffect(() => {
    if (sdk && oidcConfig && !oidcFinishLoginOnce.current) {
      oidcFinishLoginOnce.current = true;
      sdk.oidc.finishLoginIfNeed().finally(() => {
        setIsSessionLoading(false);
        // We want that the session will fetched only once
        sessionFetchedOnce.current = true;
      });
    }
  }, []);

  // Fetch the {user,session} once and prevent subsequent calls to the underlying API.
  const fetchSession = useCallback(async () => {
    if (sessionFetchedOnce.current) return;
    sessionFetchedOnce.current = true;

    await withValidation(sdk?.refresh)(undefined, true);
    setIsSessionLoading(false);
  }, [sdk]);

  const fetchUser = useCallback(async () => {
    if (userFetchedOnce.current) return;
    userFetchedOnce.current = true;
    await fetchSession();

    withValidation(sdk.me)().then(() => {
      setIsUserLoading(false);
    });
  }, [sdk]);

  const value = useMemo<IContext>(
    () => ({
      fetchUser,
      user,
      isUserLoading,
      fetchSession,
      session,
      isAuthenticated,
      isSessionLoading,
      projectId,
      baseUrl,
      baseStaticUrl,
      baseCdnUrl,
      storeLastAuthenticatedUser,
      keepLastAuthenticatedUserAfterLogout,
      refreshCookieName,
      setUser,
      setSession,
      setIsAuthenticated,
      claims,
      sdk,
    }),
    [
      fetchUser,
      user,
      isUserLoading,
      fetchSession,
      session,
      isAuthenticated,
      isSessionLoading,
      projectId,
      baseUrl,
      baseStaticUrl,
      baseCdnUrl,
      keepLastAuthenticatedUserAfterLogout,
      refreshCookieName,
      setUser,
      setSession,
      setIsAuthenticated,
      claims,
      sdk,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export default AuthProvider;
