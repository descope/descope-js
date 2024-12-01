import { State } from './types';

export const initialState: State = {
  me: {
    loading: false,
    error: null,
    data: {},
  },
  customAttributes: {
    loading: false,
    error: null,
    data: [],
  },
};
