import createCoreSdk, { SdkResponse } from '@descope/core-js-sdk';
import createWebAuthn from './webauthn';
import createFedCM from './fedcm';
import withFlow from './flow';
import {
  getSessionToken,
  getRefreshToken,
} from '../enhancers/withPersistTokens/helpers';
import createOidc from './oidc';
import { CoreSdk, WebSdkConfig } from '../types';
import { OIDC_LOGOUT_ERROR_CODE, OIDC_REFRESH_ERROR_CODE } from '../constants';
import logger from '../enhancers/helpers/logger';

const createSdk = (config: WebSdkConfig) => {
  const coreSdk = createCoreSdk(config);

  const oidc = createOidc(coreSdk, config.projectId, config.oidcConfig);

  return {
    ...coreSdk,
    refresh: async (
      token?: string,
      tryRefresh?: boolean,
    ): ReturnType<CoreSdk['refresh']> => {
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
      // Descope use this query param to monitor if refresh is made
      // When the user is already logged in in the past or not (We want to optimize that in the future)
      const currentSessionToken = getSessionToken();
      const currentRefreshToken = getRefreshToken();

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
