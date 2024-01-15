/* eslint-disable no-param-reassign */
import { createStateManagementMixin } from '../../mixins/createStateManagementMixin';
import { createUser } from './asyncActions/createUser';
import { deleteUser } from './asyncActions/deleteUser';
import { expireUserPassword } from './asyncActions/expireUserPassword';
import { searchUser } from './asyncActions/searchUsers';
import { State } from './types';

const initialState: State = {
  usersList: {
    data: [],
    loading: false,
    error: null
  },
  createUser: {
    loading: false,
    error: null
  },
  deleteUser: {
    loading: false,
    error: null
  },
  expireUserPassword: {
    loading: false,
    error: null
  },
  filter: '',
  selectedUsersIds: []
};

export const stateMixin = createStateManagementMixin({
  name: 'users',
  initialState,
  reducers: {
    setFilter: (state, { payload }) => {
      state.filter = payload?.toLowerCase();
    },
    setSelectedUsersIds: (state, { payload }) => {
      state.selectedUsersIds = payload;
    }
  },
  extraReducers: (builder) => {
    createUser.reducer(builder);
    deleteUser.reducer(builder);
    searchUser.reducer(builder);
    expireUserPassword.reducer(builder);
  },
  asyncActions: {
    searchUsers: searchUser.action,
    createUser: createUser.action,
    deleteUser: deleteUser.action,
    expireUserPassword: expireUserPassword.action
  }
});

