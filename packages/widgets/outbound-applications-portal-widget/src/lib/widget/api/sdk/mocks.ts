import { OutboundApplication } from '../types';

const load: () => Promise<{ apps: OutboundApplication[] }> = async () =>
  new Promise((resolve) => {
    resolve({
      apps: [
        {
          id: 'ssoapp1',
          name: 'App 1',
          description: 'This is the first SAML app',
          enabled: true,
          logo: 'logo1',
        },
        {
          id: 'ssoapp2',
          name: 'App 2',
          description: 'This is the first OIDC app',
          enabled: true,
          logo: 'logo2',
        },
        {
          id: 'ssoapp3',
          name: 'App 3',
          description: 'This is the second SAML app',
          enabled: true,
          logo: 'logo3',
        },
      ],
    });
  });

const outboundApps = {
  load,
};

export { outboundApps };
