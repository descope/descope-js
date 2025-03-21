import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CookieConfig } from '@descope/web-js-sdk';
import Context from '../../hooks/Context';
import { IContext, User } from '../../types';
import { withValidation } from '../../utils';
import useSdk from './useSdk';

interface IAuthProviderProps {
  projectId: string;
  baseUrl?: string;
  // allows to override the base URL that is used to fetch static files
  baseStaticUrl?: string;
  // If true, tokens will be stored on local storage and can accessed with getToken function
  persistTokens?: boolean;
  // If true, session token (jwt) will be stored on cookie. Otherwise, the session token will be
  // stored on local storage and can accessed with getSessionToken function
  // Use this option if session token will stay small (less than 1k)
  // NOTE: Session token can grow, especially in cases of using authorization, or adding custom claims
  sessionTokenViaCookie?: CookieConfig;
  // If true, last authenticated user will be stored on local storage and can accessed with getUser function
  storeLastAuthenticatedUser?: boolean;
  // If true, last authenticated user will not be removed after logout
  keepLastAuthenticatedUserAfterLogout?: boolean;
  // Use this option if the authentication is done via cookie, and configured with a different name
  // Currently, this is done using Descope Flows
  refreshCookieName?: string;
  children?: React.ReactNode;
}

const AuthProvider: FC<IAuthProviderProps> = ({
  projectId,
  baseUrl = '',
  baseStaticUrl = '',
  sessionTokenViaCookie = false,
  persistTokens = true,
  storeLastAuthenticatedUser = true,
  keepLastAuthenticatedUserAfterLogout = false,
  refreshCookieName = '',
  children = undefined,
}) => {
  const [user, setUser] = useState<User>();
  const [session, setSession] = useState<string>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [isUserLoading, setIsUserLoading] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(false);

  const sdk = useSdk({
    projectId,
    baseUrl,
    persistTokens,
    sessionTokenViaCookie,
    storeLastAuthenticatedUser,
    keepLastAuthenticatedUserAfterLogout,
    refreshCookieName,
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
      isSessionFetched: isSessionFetched.current,
      projectId,
      baseUrl,
      baseStaticUrl,
      storeLastAuthenticatedUser,
      keepLastAuthenticatedUserAfterLogout,
      refreshCookieName,
      setUser,
      setSession,
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
      isSessionFetched.current,
      projectId,
      baseUrl,
      baseStaticUrl,
      keepLastAuthenticatedUserAfterLogout,
      refreshCookieName,
      setUser,
      setSession,
      sdk,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
};

export default AuthProvider;
