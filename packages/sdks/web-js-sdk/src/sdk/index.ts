import createCoreSdk, { SdkResponse } from '@descope/core-js-sdk';
import createWebAuthn from './webauthn';
import createFedCM from './fedcm';
import withFlow from './flow';
import {
  getSessionToken,
  getRefreshToken,
  getLastAuthStatus,
} from '../enhancers/withPersistTokens/helpers';
import { LAST_AUTH_STATE } from '../enhancers/withPersistTokens/constants';
import { decodeProjectCreatedAt } from '@descope/sdk-helpers';
import createOidc from './oidc';
import { CoreSdk, WebSdkConfig } from '../types';
import {
  OIDC_LOGOUT_ERROR_CODE,
  OIDC_REFRESH_ERROR_CODE,
  REFRESH_DISABLED,
  SKIP_INITIAL_REFRESH_FOR_PROJECTS_AFTER,
} from '../constants';
import logger from '../enhancers/helpers/logger';
import { isDescopeBridge } from '../enhancers/helpers';

const createSdk = (config: WebSdkConfig) => {
  const coreSdk = createCoreSdk(config);

  const oidc = createOidc(coreSdk, config.projectId, config.oidcConfig);

  return {
    ...coreSdk,
    refresh: async (
      token?: string,
      tryRefresh?: boolean,
      options?: { skipIfNoSession?: boolean },
    ): ReturnType<CoreSdk['refresh']> => {
      if (isDescopeBridge()) {
        logger.debug(`Refresh called in native flow: ${new Error().stack}`);
        return Promise.resolve({
          ok: false,
          error: {
            errorCode: REFRESH_DISABLED,
            errorDescription:
              'Refresh is not supported in native flows via the web SDK',
          },
        });
      }

      if (config.oidcConfig) {
        try {
          await oidc.refreshToken(token);
          return Promise.resolve({ ok: true });
        } catch (error) {
          return Promise.resolve({
            ok: false,
            error: {
              errorCode: OIDC_REFRESH_ERROR_CODE,
              errorDescription: error.toString(),
            },
          });
        }
      }
      const currentSessionToken = getSessionToken();
      const currentRefreshToken = getRefreshToken();

      // Skip the refresh call when we can prove there is no session to restore.
      // Callers opt-in via options.skipIfNoSession (e.g. AuthProvider on mount).
      if (
        options?.skipIfNoSession &&
        !currentSessionToken &&
        !currentRefreshToken &&
        !config.getExternalToken
      ) {
        const status = getLastAuthStatus(config.projectId);
        if (status === LAST_AUTH_STATE.unauth) {
          return { ok: true };
        }
        if (status !== LAST_AUTH_STATE.auth) {
          // Flag absent: skip immediately for projects newer than the cutoff
          const createdAt = decodeProjectCreatedAt(config.projectId);
          if (
            createdAt !== null &&
            createdAt >= SKIP_INITIAL_REFRESH_FOR_PROJECTS_AFTER
          ) {
            return { ok: true };
          }
          // Legacy project: fall through to make the bootstrap call
        }
      }

      let externalToken = '';
      if (config.getExternalToken) {
        try {
          externalToken = await config.getExternalToken?.();
        } catch (error) {
          logger.debug('Error getting external token while refreshing', error);
          // continue without external token
        }
      }

      return coreSdk.refresh(
        token,
        {
          dcs: currentSessionToken ? 't' : 'f',
          dcr: currentRefreshToken ? 't' : 'f',
        },
        externalToken,
        tryRefresh,
      );
    },
    // Call the logout function according to the oidcConfig
    // And return the response in the same format
    logout: async (token?: string): Promise<SdkResponse<never>> => {
      if (config.oidcConfig) {
        // logout is made with id_token_hint
        try {
          await oidc.logout({ id_token_hint: token });
          return Promise.resolve({ ok: true });
        } catch (error) {
          return Promise.resolve({
            ok: false,
            error: {
              errorCode: OIDC_LOGOUT_ERROR_CODE,
              errorDescription: error.toString(),
            },
          });
        }
      }
      return coreSdk.logout(token);
    },
    flow: withFlow(coreSdk),
    webauthn: createWebAuthn(coreSdk),
    fedcm: createFedCM(coreSdk, config.projectId),
    oidc,
  };
};

export default createSdk;

export type CreateWebSdk = typeof createSdk;
export type WebSdk = ReturnType<CreateWebSdk>;
