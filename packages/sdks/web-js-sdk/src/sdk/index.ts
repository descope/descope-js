import createCoreSdk from '@descope/core-js-sdk';
import createWebAuthn from './webauthn';
import createFedCM from './fedcm';
import createOidc, { OidcConfig } from './oidc';
import withFlow from './flow';
import {
  getIdToken,
  getRefreshToken,
  getSessionToken,
} from '../enhancers/withPersistTokens/helpers';

type CoreSdkParams = Parameters<typeof createCoreSdk>[0]; // Extracts the first argument type
type ExtendedCoreSdkArgs = CoreSdkParams & { oidcConfig?: OidcConfig }; // Extends with oidcConfig

const createSdk = (config: ExtendedCoreSdkArgs) => {
  const coreSdk = createCoreSdk(config);

  const oidc = createOidc(coreSdk, config.projectId, config?.oidcConfig);

  return {
    ...coreSdk,
    refresh: (token?: string) => {
      // Descope use this query param to monitor if refresh is made
      // When the user is already logged in in the past or not (We want to optimize that in the future)
      const currentSessionToken = getSessionToken();
      const idToken = getIdToken();
      if (idToken) {
        // the before hook of the core sdk does not take care of oidc tokens
        const oidcRefreshToken = token || getRefreshToken();
        if (!oidcRefreshToken) {
          // Asaf -think what to do here
        }
        return oidc.refreshToken(oidcRefreshToken);
      }
      return coreSdk.refresh(token, { dcs: currentSessionToken ? 't' : 'f' });
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
