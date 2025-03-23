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

const OIDC_LOGOUT_ERROR_CODE = 'J161000';
const OIDC_REFRESH_ERROR_CODE = 'J161001';

const createSdk = (config: WebSdkConfig) => {
  const coreSdk = createCoreSdk(config);

  const oidc = createOidc(coreSdk, config.projectId, config.oidcConfig);

  return {
    ...coreSdk,
    refresh: async (token?: string): ReturnType<CoreSdk['refresh']> => {
      if (config.oidcConfig) {
        try {
          const res = await oidc.refreshToken(token);
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
      return coreSdk.refresh(token, {
        dcs: currentSessionToken ? 't' : 'f',
        dcr: currentRefreshToken ? 't' : 'f',
      });
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
