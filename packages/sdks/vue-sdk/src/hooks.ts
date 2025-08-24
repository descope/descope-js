/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { computed, inject, watch } from 'vue';
import { DESCOPE_INJECTION_KEY } from './constants';
import type * as _2 from 'oidc-client-ts'; // eslint-disable-line

const injectDescope = () => {
  const context = inject(DESCOPE_INJECTION_KEY);
  if (!context)
    throw Error(
      'Missing Descope context, make sure you are using the Descope plugin',
    );

  return context;
};

export const useOptions = () => injectDescope().options;

export const useDescope = () => injectDescope().sdk;

export const useSession = () => {
  const { session } = injectDescope();

  if (session.isFetchSessionWasNeverCalled.value) {
    session.fetchSession(true);
  }

  return {
    isLoading: computed(
      () =>
        session.isLoading.value || session.isFetchSessionWasNeverCalled.value,
    ),
    sessionToken: session.session,
    isAuthenticated: session.isAuthenticated,
  };
};

export const useUser = () => {
  const { user, session } = injectDescope();

  const fetchUser = () => {
    if (!user.user.value && session.session.value) {
      user.fetchUser();
    }
  };

  fetchUser();

  watch(session.session, fetchUser);

  return {
    isLoading: computed(
      () => user.isLoading.value || user.isFetchUserWasNeverCalled.value,
    ),
    user: user.user,
  };
};
