import { State } from './types';

export const initialState: State = {
  accessKeysList: {
    data: [],
    loading: false,
    error: null,
  },
  createAccessKey: {
    loading: false,
    error: null,
  },
  activateAccessKey: {
    loading: false,
    error: null,
  },
  deactivateAccessKey: {
    loading: false,
    error: null,
  },
  deleteAccessKey: {
    loading: false,
    error: null,
  },
  tenantRoles: {
    loading: false,
    error: null,
    data: [],
  },
  searchParams: { text: '', sort: [] },
  selectedAccessKeysIds: [],
  notifications: [],
};
