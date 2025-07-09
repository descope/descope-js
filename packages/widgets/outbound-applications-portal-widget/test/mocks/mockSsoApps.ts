export const mockSsoApps = [
  {
    id: 'ssoapp1',
    name: 'SAML App 1',
    description: 'This is the first SAML app',
    enabled: true,
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
    logo: 'logo2',
  },
  {
    id: 'ssoapp3',
    name: 'SAML App 2',
    description: 'This is the second SAML app',
    enabled: true,
    logo: 'logo3',
    samlSettings: {
      idpInitiatedUrl: 'http://www.testingmcafeesites.com/testcat_ac.html',
    },
  },
];
