/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';

// Fetch user data from the /me endpoint
// Note: This does NOT parse the session token - that's handled by parseSessionToken action
const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['user']['me']>,
  ThunkConfigExtraApi
>('users/me', async (arg, { extra: { api } }) => {
  const userData = await api.user.me();
  return userData;
});

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      state.me.data = action.payload;
    },
  },
  withRequestStatus((state: State) => state.me),
);

export const getMe = { action, reducer };
