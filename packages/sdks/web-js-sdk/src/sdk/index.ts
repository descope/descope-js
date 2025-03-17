import createCoreSdk from '@descope/core-js-sdk';
import createWebAuthn from './webauthn';
import createFedCM from './fedcm';
import withFlow from './flow';
import {
  getSessionToken,
  getRefreshToken,
} from '../enhancers/withPersistTokens/helpers';
import createOidc from './oidc';
import { WebSdkConfig } from '../types';

const createSdk = (config: WebSdkConfig) => {
  const coreSdk = createCoreSdk(config);

  return {
    ...coreSdk,
    refresh: (token?: string) => {
      // Descope use this query param to monitor if refresh is made
      // When the user is already logged in in the past or not (We want to optimize that in the future)
      const currentSessionToken = getSessionToken();
      const currentRefreshToken = getRefreshToken();
      return coreSdk.refresh(token, {
        dcs: currentSessionToken ? 't' : 'f',
        dcr: currentRefreshToken ? 't' : 'f',
      });
    },
    flow: withFlow(coreSdk),
    webauthn: createWebAuthn(coreSdk),
    fedcm: createFedCM(coreSdk, config.projectId),
    oidc: createOidc(coreSdk, config.projectId, config.oidcConfig),
  };
};

export default createSdk;

export type CreateWebSdk = typeof createSdk;
export type WebSdk = ReturnType<CreateWebSdk>;
