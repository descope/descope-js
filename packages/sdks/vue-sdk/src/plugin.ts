// src/plugins/auth.js

import { App, Ref, computed, readonly, ref, unref, watch } from 'vue';
import { DESCOPE_INJECTION_KEY, baseHeaders } from './constants';
import { UserData, type Options, type Sdk } from './types';
import createSdk from './sdk';

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
      ...options,
      autoRefresh: true,
      baseHeaders,
    });

    externalSdk = sdk;

    const isSessionLoading = ref<boolean | null>(null);
    const sessionToken = ref('');

    const isUserLoading = ref<boolean | null>(null);
    const user = ref<UserData>(null);

    sdk.onSessionTokenChange((s) => {
      sessionToken.value = s;
    });

    sdk.onUserChange((u) => {
      user.value = u;
    });

    const fetchSession = async () => {
      isSessionLoading.value = true;
      await sdk.refresh();
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
        if (!sessionToken.value && isFetchSessionWasNeverCalled.value) {
          fetchSession().catch(reject);
        }

        // if the session is loading we want to wait for it to finish before resolving
        watch(
          () => isSessionLoading.value,
          () => !isSessionLoading.value && resolve(!!unref(sessionToken)),
          { immediate: true },
        );
      });

    app.provide(DESCOPE_INJECTION_KEY, {
      session: {
        fetchSession,
        isLoading: readonly(isSessionLoading),
        session: readonly(sessionToken),
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
    });
  },
};
