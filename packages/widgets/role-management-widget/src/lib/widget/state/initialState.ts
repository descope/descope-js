import { State } from './types';

export const initialState: State = {
  rolesList: {
    data: [],
    loading: false,
    error: null,
  },
  createRole: {
    loading: false,
    error: null,
  },
  updateRole: {
    loading: false,
    error: null,
  },
  deleteRole: {
    loading: false,
    error: null,
  },
  tenantPermissions: {
    loading: false,
    error: null,
    data: [],
  },
  searchParams: { text: '', sort: [] },
  selectedRolesIds: [],
  notifications: [],
};
