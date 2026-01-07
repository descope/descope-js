import { useContext, createMemo, onMount, createEffect } from 'solid-js';
import { DescopeContext } from './DescopeProvider';
import type { UseSessionReturn, UseUserReturn, Sdk } from './types';

/**
 * Access the Descope SDK instance
 */
export function useDescope(): Sdk {
  const context = useContext(DescopeContext);
  if (!context) {
    throw new Error('useDescope must be used within a DescopeProvider');
  }
  return context.sdk;
}

/**
 * Access session state and automatically fetch session on mount
 */
export function useSession(): UseSessionReturn {
  const context = useContext(DescopeContext);
  if (!context) {
    throw new Error('useSession must be used within a DescopeProvider');
  }

  const {
    session,
    claims,
    isAuthenticated,
    isSessionLoading,
    isOidcLoading,
    fetchSession,
  } = context;

  onMount(() => {
    fetchSession();
  });

  const loading = createMemo(() => isSessionLoading() || isOidcLoading());

  return {
    sessionToken: session,
    claims,
    isAuthenticated,
    isSessionLoading: loading,
  };
}

/**
 * Access user state and automatically fetch user when authenticated
 */
export function useUser(): UseUserReturn {
  const context = useContext(DescopeContext);
  if (!context) {
    throw new Error('useUser must be used within a DescopeProvider');
  }

  const { user, isUserLoading, isAuthenticated, fetchUser } = context;

  createEffect(() => {
    if (isAuthenticated() && !user()) {
      fetchUser();
    }
  });

  return {
    user,
    isUserLoading,
  };
}

/**
 * Access the full auth context (advanced usage)
 */
export function useDescopeContext() {
  const context = useContext(DescopeContext);
  if (!context) {
    throw new Error('useDescopeContext must be used within a DescopeProvider');
  }
  return context;
}
