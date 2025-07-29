import { SSOAppType } from '../../src/lib/widget/api/types';

export const mockSsoApps = [
  {
    id: 'ssoapp1',
    name: 'SAML App 1',
    description: 'This is the first SAML app',
    enabled: true,
    appType: SSOAppType.saml,
    logo: 'logo1',
    samlSettings: {
      idpInitiatedUrl: 'http://www.testingmcafeesites.com/testcat_ac.html',
    },
  },
  {
    id: 'ssoapp2',
    name: 'OIDC App 1',
    description: 'This is the first OIDC app',
    enabled: true,
    appType: SSOAppType.oidc,
    logo: 'logo2',
  },
  {
    id: 'ssoapp3',
    name: 'SAML App 2',
    description: 'This is the second SAML app',
    enabled: true,
    appType: SSOAppType.saml,
    logo: 'logo3',
    samlSettings: {
      idpInitiatedUrl: 'http://www.testingmcafeesites.com/testcat_ac.html',
    },
  },
  {
    id: 'ssoapp4',
    name: 'OIDC App 2',
    description: 'This is the second OIDC app',
    enabled: true,
    appType: SSOAppType.oidc,
    logo: 'logo2',
    oidcSettings: {
      customIdpInitiatedLoginPageUrl:
        'http://www.testingmcafeesites.com/testcat_ac.html',
    },
  },
];
