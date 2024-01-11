/* eslint-disable no-param-reassign */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Api } from '../../apiMixin/api';
import { FirstParameter, RemoveVoid, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer } from './helpers';

export const action = createAsyncThunk
  <any, FirstParameter<Api['user']['search']> | void, ThunkConfigExtraApi>
  (
    'users/search',
    (arg, { extra: { api } }) => api.user.search(arg as RemoveVoid<typeof arg>)
  );

// eslint-disable-next-line @typescript-eslint/no-shadow
const reducer = buildAsyncReducer(action, (state) => state.usersList, (state, action) => {
  state.usersList.data = (action.payload);
});

export const searchUser = { action, reducer };
