import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CookieConfig, OidcConfig } from '@descope/web-js-sdk';
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
  // If true, tokens will be stored on local storage and can accessed with getToken function
  persistTokens?: boolean;
  // If true, session token (jwt) will be stored on cookie. Otherwise, the session token will be
  // stored on local storage and can accessed with getSessionToken function
  // Use this option if session token will stay small (less than 1k)
  // NOTE: Session token can grow, especially in cases of using authorization, or adding custom claims
  sessionTokenViaCookie?: CookieConfig;
  // If truthy he SDK refresh and logout functions will use the OIDC client
  // Accepts boolean or OIDC configuration
  oidcConfig?: OidcConfig;
  // If true, last authenticated user will be stored on local storage and can accessed with getUser function
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
  oidcConfig = undefined,
  storeLastAuthenticatedUser = true,
  keepLastAuthenticatedUserAfterLogout = false,
  refreshCookieName = '',
  getExternalToken = undefined,
  children = undefined,
}) => {
  const [user, setUser] = useState<User>();
  const [session, setSession] = useState<string>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [isUserLoading, setIsUserLoading] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(false);

  // if oidc config is enabled, we attempt to finish the login, so we start as loading
  const [isOidcLoading, setIsOidcLoading] = useState(!!oidcConfig);
  const isOidcFinishedLogin = useRef(false);

  const sdk = useSdk({
    projectId,
    baseUrl,
    persistTokens,
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

      return () => {
        unsubscribeSessionToken();
        unsubscribeUser();
        unsubscribeIsAuthenticated();
      };
    }
    return undefined;
  }, [sdk]);

  const isSessionFetched = useRef(false);
  const isUserFetched = useRef(false);

  // if oidc config is enabled, and we have oidc params in the url
  // we will finish the login (this should run only once)
  useEffect(() => {
    if (sdk && oidcConfig && !isOidcFinishedLogin.current) {
      isOidcFinishedLogin.current = true;
      sdk.oidc.finishLoginIfNeed().finally(() => {
        setIsOidcLoading(false);
        // We want that the session will fetched only once
        isSessionFetched.current = true;
      });
    }
  }, []);

  const fetchSession = useCallback(() => {
    // We want that the session will fetched only once
    if (isSessionFetched.current) return;
    isSessionFetched.current = true;

    setIsSessionLoading(true);
    withValidation(sdk?.refresh)().then(() => {
      setIsSessionLoading(false);
    });
  }, [sdk]);

  const fetchUser = useCallback(() => {
    // We want that the user will fetched only once
    if (isUserFetched.current) return;
    isUserFetched.current = true;

    setIsUserLoading(true);
    withValidation(sdk.me)().then(() => {
      setIsUserLoading(false);
    });
  }, [sdk]);

  const value = useMemo<IContext>(
    () => ({
      fetchUser,
      user,
      isUserLoading,
      isUserFetched: isUserFetched.current,
      fetchSession,
      session,
      isAuthenticated,
      isSessionLoading,
      isOidcLoading,
      isSessionFetched: isSessionFetched.current,
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
      sdk,
    }),
    [
      fetchUser,
      user,
      isUserLoading,
      isUserFetched.current,
      fetchSession,
      session,
      isAuthenticated,
      isSessionLoading,
      isOidcLoading,
      isSessionFetched.current,
      projectId,
      baseUrl,
      baseStaticUrl,
      baseCdnUrl,
      keepLastAuthenticatedUserAfterLogout,
      refreshCookieName,
      setUser,
      setSession,
      setIsAuthenticated,
      sdk,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export default AuthProvider;
