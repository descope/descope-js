import { createSelector } from 'reselect';
import { State } from './types';

export const getMe = (state: State) => state.me.data;

export const getTenant = (state: State) => state.tenant.data;

export const getTenantAdminLinkSSO = (state: State) =>
  state.tenantAdminLinkSSO.data;

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

export const getTenantEnforceSSO = createSelector(
  getTenant,
  (tenant) => tenant.enforceSSO || false,
);
