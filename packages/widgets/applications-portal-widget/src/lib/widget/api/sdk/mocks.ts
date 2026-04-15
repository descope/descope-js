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
            idpInitiatedUrl: '',
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
            idpInitiatedUrl: '',
          },
        },
        {
          id: 'ssoapp4',
          name: 'App 4',
          description: 'This is a WS-Fed app',
          enabled: true,
          appType: SSOAppType.wsfed,
          logo: 'logo4',
          wsfedSettings: {
            idpInitiatedUrl: '',
            realm: 'urn:mock:realm',
            replyUrl: 'http://localhost/reply',
            loginPageUrl: 'http://localhost/login',
          },
        },
      ],
    });
  });

const ssoApps = {
  load,
};

export { ssoApps };
