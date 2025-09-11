import { useEffect } from 'react';
import useContext from './useContext';

const useUser = () => {
  const { user, fetchUser, isUserLoading } = useContext();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return { isUserLoading, user };
};

export default useUser;
