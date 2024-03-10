import { createSelector } from 'reselect';
import { State } from './types';
import { userStatusMappings } from './constants';

export const getRawUsersList = (state: State) => state.usersList.data;
export const getTenantRoles = (state: State) => state.tenantRoles.data;
export const getSelectedUsersLoginIds = (state: State) =>
  state.selectedUsersLoginIds;
export const getNotifications = (state: State) => state.notifications;
export const getSearchParams = (state: State) => state.searchParams;

export const getUsersList = createSelector(getRawUsersList, (users) =>
  users.map((user) => ({
    ...user,
    status: userStatusMappings[user.status] || user.status,
    roles: user.roleNames,
  })),
);

export const getSelectedUsers = createSelector(
  getSelectedUsersLoginIds,
  getUsersList,
  (selected, users) => users.filter((user) => selected.includes(user.loginIds)),
);

export const getSelectedUsersUserIds = createSelector(
  getSelectedUsers,
  (users) => users.map((user) => user.userId),
);

export const getSelectedUsersStatus = createSelector(
  getSelectedUsers,
  (users) => users.map((user) => user.status),
);

export const getIsSelectedUsersEditable = createSelector(
  getSelectedUsers,
  (selectedUsers) => selectedUsers.every((user) => user.editable),
);

export const getIsUsersSelected = createSelector(
  getSelectedUsersLoginIds,
  (selected) => !!selected.length,
);

export const getIsSingleUsersSelected = createSelector(
  getSelectedUsersLoginIds,
  (selected) => selected.length === 1,
);

export const getSelectedUserLoginId = createSelector(
  getSelectedUsersLoginIds,
  (loginIds) => loginIds?.[0]?.[0] as string,
);

export const getIsSelectedUsersEnabled = createSelector(
  getIsSingleUsersSelected,
  getSelectedUsersStatus,
  (isSingleUser, statuses) =>
    isSingleUser &&
    statuses.every((status) => status === userStatusMappings.enabled),
);

export const getIsSelectedUsersDisabled = createSelector(
  getIsSingleUsersSelected,
  getSelectedUsersStatus,
  (isSingleUser, statuses) =>
    isSingleUser &&
    statuses.every((status) => status === userStatusMappings.disabled),
);

export const getSelectedUsersDetailsForDisplay = createSelector(
  getSelectedUsers,
  (selectedUsers) => {
    if (selectedUsers.length === 1) {
      return selectedUsers[0].email;
    }
    return `${selectedUsers.length} users`;
  },
);
