import createCoreSdk from '@descope/core-js-sdk';
import createWebAuthn from './webauthn';
import createFedCM from './fedcm';
import withFlow from './flow';
import { getSessionToken } from '../enhancers/withPersistTokens/helpers';

const createSdk = ({
  getExternalAccessToken,
  ...arg
}: Parameters<typeof createCoreSdk>[0] & {
  getExternalAccessToken?: () => Promise<string>;
}) => {
  const coreSdk = createCoreSdk(arg);

  console.log('@@@ web-js createSdk with', {
    getExternalAccessToken,
  });
  return {
    ...coreSdk,
    refresh: async (token?: string) => {
      // Descope use this query param to monitor if refresh is made
      // When the user is already logged in in the past or not (We want to optimize that in the future)
      const currentSessionToken = getSessionToken();

      console.log('@@@ calling refresh with', {
        getExternalAccessToken,
      });
      let externalToken = '';
      if (getExternalAccessToken) {
        try {
          const externalAccessToken = await getExternalAccessToken();
          console.log('@@@ externalAccessToken', externalAccessToken);
          if (externalAccessToken) {
            externalToken = externalAccessToken;
          }
        } catch (e) {
          console.error('Failed to get external access token', e);
        }
      }

      return coreSdk.refresh(
        token,
        {
          dcs: currentSessionToken ? 't' : 'f',
        },
        externalToken,
      );
    },
    flow: withFlow(coreSdk),
    webauthn: createWebAuthn(coreSdk),
    fedcm: createFedCM(coreSdk, arg.projectId),
  };
};

export default createSdk;

export type CreateWebSdk = typeof createSdk;
export type WebSdk = ReturnType<CreateWebSdk>;
