import createCoreSdk from '@descope/core-js-sdk';
import createWebAuthn from './webauthn';
import createFedCM from './fedcm';
import createOidc from './oidc';
import withFlow from './flow';
import { getSessionToken } from '../enhancers/withPersistTokens/helpers';

const createSdk = (...args: Parameters<typeof createCoreSdk>) => {
  const coreSdk = createCoreSdk(...args);

  return {
    ...coreSdk,
    refresh: (token?: string) => {
      // Descope use this query param to monitor if refresh is made
      // When the user is already logged in in the past or not (We want to optimize that in the future)
      const currentSessionToken = getSessionToken();
      return coreSdk.refresh(token, { dcs: currentSessionToken ? 't' : 'f' });
    },
    flow: withFlow(coreSdk),
    webauthn: createWebAuthn(coreSdk),
    fedcm: createFedCM(coreSdk, args[0].projectId),
    oidc: createOidc(coreSdk, args[0].projectId),
  };
};

export default createSdk;

export type CreateWebSdk = typeof createSdk;
export type WebSdk = ReturnType<CreateWebSdk>;
