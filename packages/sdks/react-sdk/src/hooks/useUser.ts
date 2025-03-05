import { useEffect, useMemo, useRef, useState } from 'react';
import useContext from './useContext';

const useUser = () => {
  const { user, fetchUser, isUserLoading, isAuthenticated, isUserFetched } =
    useContext();
  const [isInit, setIsInit] = useState(false); // we want to get the user only in the first time we got a session

  // when session should be received, we want the return value of "isUserLoading" to be true starting from the first call
  // (and not only when receiving an update from the context)
  const isLoading = useRef(isUserLoading);

  const shouldFetchUser = useMemo(
    () => !user && !isUserLoading && isAuthenticated && !isInit,
    [fetchUser, isAuthenticated, isInit],
  );

  // we want this to happen before returning a value so we are using "useMemo" and not "useEffect"
  useMemo(() => {
    isLoading.current = isUserLoading;
  }, [isUserLoading]);

  // we want this to happen before returning a value so we are using "useMemo" and not "useEffect"
  useMemo(() => {
    if (shouldFetchUser && !isUserFetched) {
      isLoading.current = true;
    }
  }, [shouldFetchUser, isUserFetched]);

  useEffect(() => {
    if (shouldFetchUser) {
      setIsInit(true);
      fetchUser();
    }
  }, [shouldFetchUser]);

  return { isUserLoading: isLoading.current, user };
};

export default useUser;
