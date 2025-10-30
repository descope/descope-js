import { createSelector } from 'reselect';
import { State } from './types';
import { SSOApplication, SSOAppType } from '../api/types';

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

export const getCustomApps = createSelector(
  getSSOAppsList,
  (ssoAppsList) =>
    ssoAppsList?.filter?.((app) => app.appType === SSOAppType.custom),
);

const getAppUrl = (app: SSOApplication) => {
  switch (app.appType) {
    case SSOAppType.saml:
      return app.samlSettings?.idpInitiatedUrl;
    case SSOAppType.oidc:
      return app.oidcSettings?.customIdpInitiatedLoginPageUrl;
    case SSOAppType.custom:
      return app.customSettings?.loginPageUrl;
    default:
      return undefined;
  }
};

export const getAppsList = createSelector(
  getSamlApps,
  getOidcWithCustomIdpInitiatedLoginPageUrlApps,
  getCustomApps,
  (samlApps, oidcApps, customApps) =>
    [...samlApps, ...oidcApps, ...customApps].map((app) => ({
      name: app.name,
      icon: app.logo,
      url: getAppUrl(app),
    })),
);
