import { State } from './types';

export const getMe = (state: State) => state.me.data;

export const getTenant = (state: State) => state.tenant.data;

export const getTenantCustomAttributes = (state: State) =>
  state.tenant.data?.customAttributes || ({} as Record<string, any>);

export const getTenantName = (state: State) => state.tenant.data?.name || '';
export const getTenantEmailDomains = (state: State) =>
  state.tenant.data?.selfProvisioningDomains || [];
export const getTenantEnforceSSO = (state: State) =>
  state.tenant.data?.enforceSSO || false;
