import { useEffect, useMemo, useRef } from 'react';
import useContext from './useContext';

const useSession = () => {
  const {
    session,
    claims,
    isSessionLoading,
    isOidcLoading,
    fetchSession,
    isSessionFetched,
    isAuthenticated,
  } = useContext();

  // when session should be received, we want the return value of "isSessionLoading" to be true starting from the first call
  // (and not only when receiving an update from the context)
  const isLoading = useRef(isSessionLoading || isOidcLoading);

  // we want this to happen before returning a value so we are using "useMemo" and not "useEffect"
  useMemo(() => {
    isLoading.current = isSessionLoading || isOidcLoading;
  }, [isSessionLoading, isOidcLoading]);

  const shouldFetchSession = !isAuthenticated && !isSessionLoading;

  // we want this to happen before returning a value so we are using "useMemo" and not "useEffect"
  useMemo(() => {
    if (shouldFetchSession && !isSessionFetched) {
      isLoading.current = true;
    }
  }, [isSessionFetched]);

  // Fetch session if it's not already fetched
  // We want this to happen only once, so the dependency array should not contain shouldFetchSession
  useEffect(() => {
    if (shouldFetchSession) {
      fetchSession();
    }
  }, [fetchSession]);
  return {
    isSessionLoading: isLoading.current,
    sessionToken: session,
    claims,
    isAuthenticated,
  };
};

export default useSession;
