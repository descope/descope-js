
import { State } from './types';

export const initialState: State = {
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
  customAttributes: {
    loading: false,
    error: null,
    data: {}
  },
  filter: '',
  selectedUsersIds: [],
  notifications: []
};
