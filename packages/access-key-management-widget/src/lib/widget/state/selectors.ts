import { createSelector } from 'reselect';
import { State } from './types';

export const getRawAccessKeysList = (state: State) => state.accessKeysList.data;
export const getSelectedAccessKeysIds = (state: State) =>
  state.selectedAccessKeysIds;
export const getNotifications = (state: State) => state.notifications;
export const getSearchParams = (state: State) => state.searchParams;
export const getTenantRoles = (state: State) => state.tenantRoles.data || [];

export const getAccessKeysList = createSelector(
  getRawAccessKeysList,
  (accessKeys) =>
    accessKeys.map((accessKey) => ({
      ...accessKey,
      expireTimeFormatted: !accessKey?.expireTime
        ? 'Never'
        : new Date((accessKey?.expireTime || 0) * 1000).toLocaleString(),
      status:
        accessKey?.expireTime &&
        new Date((accessKey?.expireTime || 0) * 1000) < new Date()
          ? 'expired'
          : accessKey?.status,
    })),
);

export const getSelectedAccessKeys = createSelector(
  getSelectedAccessKeysIds,
  getAccessKeysList,
  (selected, accessKeys) =>
    accessKeys.filter((accessKey) => selected.includes(accessKey.name)),
);

export const getIsAccessKeysSelected = createSelector(
  getSelectedAccessKeysIds,
  (selected) => !!selected.length,
);

export const getIsSingleAccessKeysSelected = createSelector(
  getSelectedAccessKeysIds,
  (selected) => selected.length === 1,
);

export const getSelectedAccessKeysDetailsForDisplay = createSelector(
  getSelectedAccessKeys,
  (selectedAccessKeys) => {
    if (selectedAccessKeys.length === 1) {
      return selectedAccessKeys[0].name;
    }
    return `${selectedAccessKeys.length} access keys`;
  },
);
