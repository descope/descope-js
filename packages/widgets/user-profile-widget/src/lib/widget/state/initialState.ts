import { State } from './types';

export const initialState: State = {
  me: {
    loading: false,
    error: null,
    data: {},
  },
  devices: {
    loading: false,
    error: null,
    data: [],
  },
  notifications: [],
};
