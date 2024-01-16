/* eslint-disable no-param-reassign */
import { createStateManagementMixin } from '../../mixins/createStateManagementMixin';
import { createUser, deleteUser, expireUserPassword, searchUser, getCustomAttributes } from '../state/asyncActions';
import { initialState } from '../state/initialState';

export const stateMixin = createStateManagementMixin({
  name: 'widget',
  initialState,
  reducers: {
    setFilter: (state, { payload }) => {
      state.filter = payload?.toLowerCase();
    },
    setSelectedUsersIds: (state, { payload }) => {
      state.selectedUsersIds = payload;
    },
    clearNotifications: (state) => {
      state.notifications = [];
    }
  },
  extraReducers: (builder) => {
    createUser.reducer(builder);
    deleteUser.reducer(builder);
    searchUser.reducer(builder);
    expireUserPassword.reducer(builder);
    getCustomAttributes.reducer(builder);
  },
  asyncActions: {
    searchUsers: searchUser.action,
    createUser: createUser.action,
    deleteUser: deleteUser.action,
    expireUserPassword: expireUserPassword.action,
    getCustomAttributes: getCustomAttributes.action,
  }
});

