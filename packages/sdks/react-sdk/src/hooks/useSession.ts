import { useEffect } from 'react';
import useContext from './useContext';

const useSession = () => {
  const { session, isSessionLoading, fetchSession, isAuthenticated, claims } =
    useContext();

  // Fetch session if it's not already fetched
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return {
    isSessionLoading,
    sessionToken: session,
    isAuthenticated,
    claims,
  };
};

export default useSession;
