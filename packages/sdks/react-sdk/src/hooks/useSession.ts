import { useEffect } from 'react';
import useContext from './useContext';
import { isDescopeBridge } from '../utils';

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

  // In case we're in a native flow, we won't refresh the session anyway, so no point in marking the state as loading
  const shouldFetchSession =
    !isAuthenticated && !isSessionLoading && !isDescopeBridge();

  // Derive the loading state directly on every render instead of caching it in
  // a ref that only updates when the context value *changes*. When refresh()
  // short-circuits synchronously the AuthProvider's setIsSessionLoading(true)
  // and (false) can be batched into a single commit (or React can bail out of
  // the re-render entirely, since the value nets false→false) - the context
  // value then never observably toggles, a change-keyed memo never re-runs, and
  // a cached ref stays stuck `true` forever (#1393, and its resurfacing via the
  // #1436 setTimeout race). Computing inline removes the dependency on observing
  // the transition: we're loading while the SDK is actively refreshing, or
  // before the one-shot fetch has completed for a session we expect to receive.
  const isSessionLoadingResolved =
    isSessionLoading ||
    isOidcLoading ||
    (shouldFetchSession && !isSessionFetched);

  // Fetch session if it's not already fetched
  // We want this to happen only once, so the dependency array should not contain shouldFetchSession
  useEffect(() => {
    if (shouldFetchSession) {
      fetchSession();
    }
  }, [fetchSession]);

  return {
    isSessionLoading: isSessionLoadingResolved,
    sessionToken: session,
    claims,
    isAuthenticated,
  };
};

export default useSession;
