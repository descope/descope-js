import { State } from './types';

export const initialState: State = {
  outboundAppsList: {
    data: [],
    loading: false,
    error: null,
  },
  connectedOutboundAppsIds: {
    data: [],
    loading: false,
    error: null,
  },
  allowedAppsIds: {
    data: undefined,
  },
  me: {
    loading: false,
    error: null,
    data: {},
  },
};
