import { SSOAppType } from "../../src/lib/widget/api/types";

export const mockSsoApps = [
  {
    id: 'ssoapp1',
    name: 'SAML App 1',
    description: 'This is the first SAML app',
    enabled: true,
    appType: SSOAppType.saml,
    logo: 'logo1',
    samlSettings: {
      idpInitiatedURL: 'http://idpInitiatedURL.com',
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
      idpInitiatedURL: 'http://idpInitiatedURL2.com',
    },
  },
]
