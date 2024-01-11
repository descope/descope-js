import { createSelector } from 'reselect';
import { State } from './types';

const getUsersList = (state: State) => state.usersList.data;
const getFilter = (state: State) => state.filter;
export const getSelectedUsersIds = (state: State) => state.selectedUsersIds;
const getSelectedUsers = createSelector(getSelectedUsersIds, getUsersList, (selected, users) => users.filter(user => selected.includes(user.loginIds)));

const isFilterMatchesString = (filter: string, value: any) => value.toString().toLowerCase().includes(filter);

export const getFilteredUsers = createSelector(getUsersList, getFilter, (users, filter) => {
  if (!filter.length) return users;

  // TODO: filter by relevant fields only?
  return users.filter(user => Object.keys(user).some(key => {
    const value = user[key];

    if (Array.isArray(value)) {
      return value.some((v: string) => isFilterMatchesString(filter, v));
    }

    return isFilterMatchesString(filter, value);
  }));
});

export const getIsUsersSelected = createSelector(getSelectedUsersIds, (selected) => !!selected.length);

export const getSelectedUsersDetailsForDisplay = createSelector(getSelectedUsers, (selectedUsers) => {
  if (selectedUsers.length === 1) {
    return selectedUsers[0].email;
  }
  return `${selectedUsers.length} users`;
});
