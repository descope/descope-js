/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { compareArrays } from '@descope/sdk-helpers';
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
  FirstParameter<Sdk['user']['enable']>,
  ThunkConfigExtraApi
>('users/enable', (arg, { extra: { api } }) => api.user.enable(arg));

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      const userIdx = state.usersList.data.findIndex((user) =>
        compareArrays(user.loginIds, action.payload.user?.loginIds),
      );
      if (userIdx !== -1) {
        state.usersList.data[userIdx].status = action.payload.user?.status;
      }
    },
  },
  withRequestStatus((state: State) => state.enableUser),
  withNotifications({
    getSuccessMsg: () => 'User enabled successfully',
    getErrorMsg: (action) => ({
      msg: 'Failed to enable user',
      detail: action.error?.message,
    }),
  }),
);

export const enableUser = { action, reducer };
