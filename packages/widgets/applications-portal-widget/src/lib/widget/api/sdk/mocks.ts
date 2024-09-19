import { SSOApplication, SSOAppType } from '../types';

const load: () => Promise<{ apps: SSOApplication[] }> = async () =>
  new Promise((resolve) => {
    resolve({
      apps: [
        {
          id: 'ssoapp1',
          name: 'App 1',
          description: 'This is the first SAML app',
          enabled: true,
          appType: SSOAppType.saml,
          logo: 'logo1',
          samlSettings: {
            idpInitiatedUrl: 'http://idpInitiatedURL.com',
          },
        },
        {
          id: 'ssoapp2',
          name: 'App 2',
          description: 'This is the first OIDC app',
          enabled: true,
          appType: SSOAppType.oidc,
          logo: 'logo2',
        },
        {
          id: 'ssoapp3',
          name: 'App 3',
          description: 'This is the second SAML app',
          enabled: true,
          appType: SSOAppType.saml,
          logo: 'logo3',
          samlSettings: {
            idpInitiatedUrl: 'http://idpInitiatedURL2.com',
          },
        },
      ]
    });
  });

const ssoApps = {
  load,
};

export { ssoApps };
