import { createSelector } from 'reselect';
import { State } from './types';

export const getMe = (state: State) => state.me.data;

export const getTenant = (state: State) => {
  console.log('XXX getTenant', state.tenant.data);
  return state.tenant.data;
};

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
