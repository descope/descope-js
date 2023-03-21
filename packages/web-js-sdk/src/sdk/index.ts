import createCoreSdk from '@descope/core-js-sdk';
import createWebAuthn from './webauthn';
import withFlow from './flow';

const createSdk = (...args: Parameters<typeof createCoreSdk>) => {
  const coreSdk = createCoreSdk(...args);

  return {
    ...coreSdk,
    flow: withFlow(coreSdk),
    webauthn: createWebAuthn(coreSdk),
  };
};

export default createSdk;

export type CreateWebSdk = typeof createSdk;
export type WebSdk = ReturnType<CreateWebSdk>;
