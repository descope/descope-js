import { createAsyncThunk } from '@reduxjs/toolkit';
import { Api } from '../../apiMixin/api';
import { FirstParameter, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer } from './helpers';

export const action = createAsyncThunk
  <any, FirstParameter<Api['user']['create']>, ThunkConfigExtraApi>
  (
    'users/create',
    (arg, { extra: { api } }) => api.user.create(arg)
  );

// eslint-disable-next-line @typescript-eslint/no-shadow
const reducer = buildAsyncReducer(action, (state) => state.createUser, (state, action) => {
  state.usersList.data.push(action.payload);
});

export const createUser = { action, reducer };
