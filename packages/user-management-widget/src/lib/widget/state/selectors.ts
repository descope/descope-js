import { createSelector } from 'reselect';
import { State } from './types';

const getUsersList = (state: State) => state.usersList.data;
const getFilter = (state: State) => state.filter;
export const getSelectedUsersLoginIds = (state: State) => state.selectedUsersLoginIds;
export const getNotifications = (state: State) => state.notifications;

export const getSelectedUsersUserIds = createSelector(getUsersList, getSelectedUsersLoginIds, (users, selectedLoginIds) =>
  users.filter(user => selectedLoginIds.includes(user.loginIds)).map(user => user.userId));

const getSelectedUsers = createSelector(getSelectedUsersLoginIds, getUsersList, (selected, users) => users.filter(user => selected.includes(user.loginIds)));

const isFilterMatchesString = (filter: string, value: any) => value.toString().toLowerCase().includes(filter);

export const getFilteredUsers = createSelector(getUsersList, getFilter, (users, filter) => {
  if (!filter.length) return users;

  return users.filter(user => Object.keys(user).some(key => {
    const value = user[key];

    if (Array.isArray(value)) {
      return value.some((v: string) => isFilterMatchesString(filter, v));
    }

    return isFilterMatchesString(filter, value);
  }));
});

export const getIsUsersSelected = createSelector(getSelectedUsersLoginIds, (selected) => !!selected.length);

export const getSelectedUsersDetailsForDisplay = createSelector(getSelectedUsers, (selectedUsers) => {
  if (selectedUsers.length === 1) {
    return selectedUsers[0].email;
  }
  return `${selectedUsers.length} users`;
});
