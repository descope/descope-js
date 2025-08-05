import { createSelector } from 'reselect';
import { State } from './types';

export const getMe = (state: State) => state.me.data;
export const getMeError = (state: State) => state.me.error;

export const getTenant = (state: State) => state.tenant.data;
export const getTenantError = (state: State) => state.tenant.error;

export const getTenantAdminLinkSSO = (state: State) =>
  state.tenantAdminLinkSSO.data;
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
