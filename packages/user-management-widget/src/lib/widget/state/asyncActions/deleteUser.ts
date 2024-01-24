/* eslint-disable no-param-reassign */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import {
  buildAsyncReducer,
  withNotifications,
  withRequestStatus,
} from './helpers';
import { pluralize } from '../../../helpers/generic';

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
  // eslint-disable-next-line @typescript-eslint/no-shadow
  withNotifications({
    // eslint-disable-next-line @typescript-eslint/no-shadow
    getSuccessMsg: (action) =>
      pluralize(action.meta.arg.length)`${['', 2]} ${['U', 'u']}ser${[
        '',
        's',
      ]} deleted successfully`,
    // eslint-disable-next-line @typescript-eslint/no-shadow
    getErrorMsg: (action) =>
      pluralize(action.meta.arg.length)`Failed to delete user${['', 's']}`,
  }),
);

export const deleteUsers = { action, reducer };
