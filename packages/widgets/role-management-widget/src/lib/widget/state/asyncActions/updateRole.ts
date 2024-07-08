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
  FirstParameter<Sdk['role']['update']>,
  ThunkConfigExtraApi
>('roles/update', (arg, { extra: { api } }) => api.role.update(arg));

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      const roleIdx = state.rolesList.data.findIndex(
        (role) => role.name === action.payload.oldName,
      );
      if (roleIdx !== -1) {
        state.rolesList.data[roleIdx] = action.payload;
      }
    },
  },
  withRequestStatus((state: State) => state.updateRole),
  withNotifications({
    getSuccessMsg: () => 'Role updated successfully',
    getErrorMsg: (action) => {
      const errorMsg = action.error?.message;
      return `
      <div>
        <div>Failed to update role</div>
        ${errorMsg}
      </div>`;
    },
  }),
);

export const updateRole = { action, reducer };
