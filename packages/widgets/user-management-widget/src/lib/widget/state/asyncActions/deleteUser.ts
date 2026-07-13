/* eslint-disable no-param-reassign */
import { pluralize } from '@descope/sdk-helpers';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, notifyOn, withRequestStatus } from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['user']['deleteBatch']>,
  ThunkConfigExtraApi
>('users/delete', (arg, { extra: { api } }) => api.user.deleteBatch(arg));

const reducer = buildAsyncReducer(action)(
  {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    onFulfilled: (state, action) => {
      state.usersList.data = state.usersList.data.filter(
        (user) => !action.meta.arg.includes(user.userId),
      );
      state.selectedUsersLoginIds = [];
    },
  },
  withRequestStatus((state: State) => state.deleteUser),
);

notifyOn(action, {
  getSuccessMsg: (settled) =>
    pluralize(settled.meta.arg.length)`${['', settled.meta.arg.length]} ${[
      'U',
      'u',
    ]}ser${['', 's']} deleted successfully`,
  getErrorMsg: (settled) =>
    pluralize(settled.meta.arg.length)`Failed to delete user${['', 's']}`,
});

export const deleteUsers = { action, reducer };
