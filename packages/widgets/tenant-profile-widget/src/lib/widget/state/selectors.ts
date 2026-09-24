import { createSelector } from 'reselect';
import { SsoConfiguration } from '../api/types';
import { State } from './types';

export const getMe = (state: State) => state.me.data;
export const getMeError = (state: State) => state.me.error;

export const getTenant = (state: State) => state.tenant.data;
export const getTenantError = (state: State) => state.tenant.error;

export const getTenantDefaultSSOLink = (state: State) =>
  state.tenantAdminLinkSSO.data.defaultLink;
// The server reports the tenant's default configuration under this reserved id, since it owns no
// entry in the wrapper map.
const DEFAULT_SSO_ID = 'default_ssoid';

export const getTenantSSOIdToSSOLink = (state: State) =>
  state.tenantAdminLinkSSO.data.ssoIdToLink;

// A stable reference, not a fresh {} per call: reselect compares input-selector results by identity,
// so allocating here would make getSSOConfigurations recompute on every unrelated store update and
// hand the multi-SSO driver a new array each time. The absent case is the common one - it is the
// initial state, and what an older server sends.
const EMPTY_AUTHENTICATION_ONLY: Record<string, boolean> = {};

export const getTenantSSOIdToAuthenticationOnly = (state: State) =>
  state.tenantAdminLinkSSO.data.ssoIdToAuthenticationOnly ||
  EMPTY_AUTHENTICATION_ONLY;
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
  getTenantSSOIdToAuthenticationOnly,
  (
    tenant,
    defaultLink,
    ssoIdToLink,
    ssoIdToAuthenticationOnly,
  ): SsoConfiguration[] => {
    const defaultConfig: SsoConfiguration[] = tenant
      ? [
          {
            id: '',
            name: 'Default SSO Configuration',
            authType: tenant.authType,
            isDefault: true,
            link: defaultLink,
            authenticationOnly:
              ssoIdToAuthenticationOnly[DEFAULT_SSO_ID] || false,
          },
        ]
      : [];

    const additionalSSO = (tenant?.additionalSSOConfigs || []).map(
      ({ ssoId, name, authType }) => ({
        id: ssoId,
        name,
        authType,
        link: ssoIdToLink[ssoId] || '',
        authenticationOnly: ssoIdToAuthenticationOnly[ssoId] || false,
      }),
    );

    return [...defaultConfig, ...additionalSSO];
  },
);

export const getAdditionalSSOIds = createSelector(getTenant, (tenant) =>
  (tenant?.additionalSSOConfigs || []).map(({ ssoId }) => ssoId),
);
