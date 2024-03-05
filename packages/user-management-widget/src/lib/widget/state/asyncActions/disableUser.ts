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
import { compareArrays } from '../../../helpers/generic';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['user']['disable']>,
  ThunkConfigExtraApi
>('users/disable', (arg, { extra: { api } }) => api.user.disable(arg));

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      const userIdx = state.usersList.data.findIndex((user) =>
        compareArrays(user.loginIds, action.payload.loginIds),
      );
      if (userIdx !== -1) {
        state.usersList.data[userIdx] = action.payload;
      }
    },
  },
  withRequestStatus((state: State) => state.disableUser),
  withNotifications({
    getSuccessMsg: () => 'User disabled successfully',
    getErrorMsg: (action) => {
      const errorMsg = action.error?.message;
      return `
      <div>
        <div>Failed to disable user</div>
        ${errorMsg}
      </div>`;
    },
  }),
);

export const disableUser = { action, reducer };
