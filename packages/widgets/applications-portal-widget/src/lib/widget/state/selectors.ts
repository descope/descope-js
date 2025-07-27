import { createSelector } from 'reselect';
import { State } from './types';
import { SSOAppType } from '../api/types';

export const getSSOAppsList = (state: State) => state.ssoAppsList.data;
export const getSamlApps = createSelector(
  getSSOAppsList,
  (ssoAppsList) =>
    ssoAppsList?.filter?.((app) => app.appType === SSOAppType.saml),
);

export const getOidcWithCustomIdpInitiatedLoginPageUrlApps = createSelector(
  getSSOAppsList,
  (ssoAppsList) =>
    ssoAppsList?.filter?.(
      (app) =>
        app.appType === SSOAppType.oidc &&
        app.oidcSettings?.customIdpInitiatedLoginPageUrl,
    ),
);

export const getAppsList = createSelector(
  getSamlApps,
  getOidcWithCustomIdpInitiatedLoginPageUrlApps,
  (samlApps, oidcApps) =>
    [...samlApps, ...oidcApps].map((app) => ({
      name: app.name,
      icon: app.logo,
      url:
        app.appType === SSOAppType.saml
          ? app.samlSettings?.idpInitiatedUrl
          : app.oidcSettings?.customIdpInitiatedLoginPageUrl,
    })),
);
