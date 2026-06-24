import { createSelector } from 'reselect';
import { SsoConfiguration } from '../api/types';
import { State } from './types';

export const getMe = (state: State) => state.me.data;
export const getMeError = (state: State) => state.me.error;

export const getTenant = (state: State) => state.tenant.data;
export const getTenantError = (state: State) => state.tenant.error;

export const getTenantDefaultSSOLink = (state: State) =>
  state.tenantAdminLinkSSO.data.defaultLink;
export const getTenantSSOIdToSSOLink = (state: State) =>
  state.tenantAdminLinkSSO.data.ssoIdToLink;
export const getTenantAdminLinkSSOError = (state: State) =>
  state.tenantAdminLinkSSO.error;

export const getTenantCustomAttributes = createSelector(
  getTenant,
  (tenant) => tenant.customAttributes || ({} as Record<string, any>),
);

export const getTenantName = createSelector(
  getTenant,
  (tenant) => tenant.name || '',
);

export const getTenantEmailDomains = createSelector(
  getTenant,
  (tenant) => tenant.selfProvisioningDomains || [],
);

export const getTenantSSOExclusions = createSelector(
  getTenant,
  (tenant) => tenant.enforceSSOExclusions || [],
);

export const getTenantEnforceSSO = createSelector(
  getTenant,
  (tenant) => tenant.enforceSSO || false,
);

export const getSSOConfigurations = createSelector(
  getTenant,
  getTenantDefaultSSOLink,
  getTenantSSOIdToSSOLink,
  (tenant, defaultLink, ssoIdToLink): SsoConfiguration[] => {
    const defaultConfig: SsoConfiguration[] = tenant
      ? [
          {
            id: '',
            name: 'Default SSO Configuration',
            authType: tenant.authType,
            isDefault: true,
            link: defaultLink,
          },
        ]
      : [];

    const additionalSSO = (tenant?.additionalSSOConfigs || []).map(
      ({ ssoId, name, authType }) => ({
        id: ssoId,
        name,
        authType,
        link: ssoIdToLink[ssoId] || '',
      }),
    );

    return [...defaultConfig, ...additionalSSO];
  },
);

export const getAdditionalSSOIds = createSelector(getTenant, (tenant) =>
  (tenant?.additionalSSOConfigs || []).map(({ ssoId }) => ssoId),
);
