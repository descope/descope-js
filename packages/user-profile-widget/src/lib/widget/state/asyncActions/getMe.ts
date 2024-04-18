/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['user']['me']>,
  ThunkConfigExtraApi
>('users/me', (arg, { extra: { api } }) => api.user.me());

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      state.me.data = action.payload;
    },
  },
  withRequestStatus((state: State) => state.me),
);

export const getMe = { action, reducer };
