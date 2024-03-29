import { State } from './types';

export const initialState: State = {
  usersList: {
    data: [],
    loading: false,
    error: null,
  },
  createUser: {
    loading: false,
    error: null,
  },
  updateUser: {
    loading: false,
    error: null,
  },
  deleteUser: {
    loading: false,
    error: null,
  },
  enableUser: {
    loading: false,
    error: null,
  },
  disableUser: {
    loading: false,
    error: null,
  },
  removePasskey: {
    loading: false,
    error: null,
  },
  setTempUserPassword: {
    loading: false,
    error: null,
  },
  customAttributes: {
    loading: false,
    error: null,
    data: [],
  },
  tenantRoles: {
    loading: false,
    error: null,
    data: [],
  },
  searchParams: { text: '', sort: [] },
  selectedUsersLoginIds: [],
  notifications: [],
};
