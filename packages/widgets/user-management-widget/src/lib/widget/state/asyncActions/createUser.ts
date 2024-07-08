/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import {
  buildAsyncReducer,
  withNotifications,
  withRequestStatus,
} from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['user']['create']>,
  ThunkConfigExtraApi
>('users/create', (arg, { extra: { api } }) => api.user.create(arg));

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      state.usersList.data.unshift(action.payload);
    },
  },
  withRequestStatus((state: State) => state.createUser),
  withNotifications({
    getSuccessMsg: () => 'User created successfully',
    getErrorMsg: (action) => {
      const errorMsg = action.error?.message;
      return `
      <div>
        <div>Failed to create user</div>
        ${errorMsg}
      </div>`;
    },
  }),
);

export const createUser = { action, reducer };
