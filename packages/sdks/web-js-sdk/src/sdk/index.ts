import createCoreSdk from '@descope/core-js-sdk';
import createWebAuthn from './webauthn';
import createFedCM from './fedcm';
import withFlow from './flow';
import { getSessionToken } from '../enhancers/withPersistTokens/helpers';

const createSdk = (...args: Parameters<typeof createCoreSdk>) => {
  const coreSdk = createCoreSdk(...args);

  return {
    ...coreSdk,
    refresh: (token?: string) => {
      const currentSessionToken = getSessionToken();
      return coreSdk.refresh(token, { dcs: currentSessionToken ? 't' : 'f' });
    },
    flow: withFlow(coreSdk),
    webauthn: createWebAuthn(coreSdk),
    fedcm: createFedCM(coreSdk, args[0].projectId),
  };
};

export default createSdk;

export type CreateWebSdk = typeof createSdk;
export type WebSdk = ReturnType<CreateWebSdk>;
