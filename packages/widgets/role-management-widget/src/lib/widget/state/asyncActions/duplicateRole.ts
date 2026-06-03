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
  FirstParameter<Sdk['role']['create']>,
  ThunkConfigExtraApi
>('roles/duplicate', (arg, { extra: { api } }) => api.role.create(arg));

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      state.rolesList.data.unshift(action.payload);
    },
  },
  withRequestStatus((state: State) => state.duplicateRole),
  withNotifications({
    getSuccessMsg: () => 'Role duplicated successfully',
    getErrorMsg: (action) => {
      const errorMsg = action.error?.message;
      return `
      <div>
        <div>Failed to duplicate role</div>
        ${errorMsg}
      </div>`;
    },
  }),
);

export const duplicateRole = { action, reducer };
