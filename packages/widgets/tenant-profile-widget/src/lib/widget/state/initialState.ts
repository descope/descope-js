import { State } from './types';

export const initialState: State = {
  me: {
    loading: false,
    error: null,
    data: {},
  },
  tenant: {
    loading: false,
    error: null,
    data: {},
  },
  tenantAdminLinkSSO: {
    loading: false,
    error: null,
    data: '',
  },
};
