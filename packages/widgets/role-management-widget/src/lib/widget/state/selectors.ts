import { createSelector } from 'reselect';
import { State } from './types';

export const getRawRolesList = (state: State) => state.rolesList.data;
export const getSelectedRolesIds = (state: State) => state.selectedRolesIds;
export const getNotifications = (state: State) => state.notifications;
export const getSearchParams = (state: State) => state.searchParams;
export const getTenantPermissions = (state: State) =>
  state.tenantPermissions.data || [];

export const getRolesList = createSelector(getRawRolesList, (roles) =>
  roles.map((role) => ({
    ...role,
    editable: role?.tenantId?.length === 0 ? 'no' : 'yes',
  })),
);

export const getSelectedRoles = createSelector(
  getSelectedRolesIds,
  getRolesList,
  (selected, roles) => roles.filter((role) => selected.includes(role.name)),
);

export const getIsRolesSelected = createSelector(
  getSelectedRolesIds,
  (selected) => !!selected.length,
);

export const getIsSingleRolesSelected = createSelector(
  getSelectedRolesIds,
  (selected) => selected.length === 1,
);

export const getSelectedRolesDetailsForDisplay = createSelector(
  getSelectedRoles,
  (selectedRoles) => {
    if (selectedRoles.length === 1) {
      return selectedRoles[0].name;
    }
    return `${selectedRoles.length} roles`;
  },
);
