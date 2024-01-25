import { createSelector } from 'reselect';
import { State } from './types';

export const getUsersList = (state: State) => state.usersList.data;
export const getSelectedUsersLoginIds = (state: State) =>
  state.selectedUsersLoginIds;
export const getNotifications = (state: State) => state.notifications;
export const getSearchParams = (state: State) => state.searchParams;

export const getSelectedUsersUserIds = createSelector(
  getUsersList,
  getSelectedUsersLoginIds,
  (users, selectedLoginIds) =>
    users
      .filter((user) => selectedLoginIds.includes(user.loginIds))
      .map((user) => user.userId),
);

const getSelectedUsers = createSelector(
  getSelectedUsersLoginIds,
  getUsersList,
  (selected, users) => users.filter((user) => selected.includes(user.loginIds)),
);

export const getIsUsersSelected = createSelector(
  getSelectedUsersLoginIds,
  (selected) => !!selected.length,
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
