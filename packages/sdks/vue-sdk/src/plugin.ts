// src/plugins/auth.js

import { App, Ref, computed, readonly, ref, unref, watch } from 'vue';
import { DESCOPE_INJECTION_KEY, baseHeaders } from './constants';
import { type JWTResponse, UserData, type Options, type Sdk } from './types';
import createSdk from './sdk';
import type * as _2 from 'oidc-client-ts'; // eslint-disable-line
import { isDescopeBridge } from '@descope/web-js-sdk';

const routeGuardInternal = ref<(() => Promise<boolean>) | null>(null);
export const routeGuard = () => unref(routeGuardInternal)?.();

let externalSdk: Sdk | undefined;
/**
 * This will return the Descope SDK instance
 * In order to get the SDK instance, this should be called after using the plugin
 * @returns Descope SDK
 */
export const getSdk = () => externalSdk;

export default {
  install: function (app: App, options: Options) {
    const sdk = createSdk({
      persistTokens: true,
      autoRefresh: true,
      ...options,
      baseHeaders,
    });

    externalSdk = sdk;

    const isSessionLoading = ref<boolean | null>(null);
    const sessionToken = ref('');
    const claims = ref<JWTResponse['claims']>();
    const isAuthenticated = ref(false);

    const isUserLoading = ref<boolean | null>(null);
    const user = ref<UserData>(null);

    sdk.onSessionTokenChange((s) => {
      sessionToken.value = s;
    });

    sdk.onClaimsChange((c) => {
      claims.value = c;
    });

    sdk.onIsAuthenticatedChange((a) => {
      isAuthenticated.value = a;
    });

    sdk.onUserChange((u) => {
      user.value = u;
    });

    const fetchSession = async (tryRefresh?: boolean) => {
      if (isDescopeBridge()) return;
      isSessionLoading.value = true;
      await sdk.refresh(undefined, tryRefresh);
      isSessionLoading.value = false;
    };

    const fetchUser = async () => {
      isUserLoading.value = true;
      await sdk.me();
      isUserLoading.value = false;
    };

    const isFetchSessionWasNeverCalled = computed(
      () => isSessionLoading.value === null,
    );

    const isFetchUserWasNeverCalled = computed(
      () => isUserLoading.value === null,
    );

    // we need to share some logic between the plugin and the routeGuard
    // maybe there is a better way to do it
    routeGuardInternal.value = () =>
      new Promise((resolve, reject) => {
        if (!isAuthenticated.value && isFetchSessionWasNeverCalled.value) {
          fetchSession().catch(reject);
        }

        // if the session is loading we want to wait for it to finish before resolving
        watch(
          () => isSessionLoading.value,
          () => !isSessionLoading.value && resolve(!!unref(isAuthenticated)),
          { immediate: true },
        );
      });

    function resetAuth() {
      sessionToken.value = '';
      isAuthenticated.value = false;
      user.value = null;
    }

    app.provide(DESCOPE_INJECTION_KEY, {
      session: {
        fetchSession,
        isLoading: readonly(isSessionLoading),
        session: readonly(sessionToken),
        claims: readonly(claims),
        isAuthenticated: readonly(isAuthenticated),
        isFetchSessionWasNeverCalled,
      },
      user: {
        fetchUser,
        isLoading: readonly(isUserLoading),
        user: readonly(user) as Ref<UserData>,
        isFetchUserWasNeverCalled,
      },
      sdk,
      options,
      resetAuth,
    });
  },
};
