/* eslint-disable no-param-reassign */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withNotifications, withRequestStatus } from './helpers';

const action = createAsyncThunk
  <any, FirstParameter<Sdk['user']['delete']>, ThunkConfigExtraApi>
  (
    'users/delete',
    (arg, { extra: { api } }) => api.user.delete(arg)
  );

const reducer = buildAsyncReducer(action)({
  // eslint-disable-next-line @typescript-eslint/no-shadow
  onFulfilled: (state, action) => {
    state.usersList.data = state.usersList.data.filter(user => !user.loginIds.every(loginId => action.meta.arg.includes(loginId)));
    state.selectedUsersIds = state.selectedUsersIds.filter(loginIds => !loginIds.every(loginId => action.meta.arg.includes(loginId)));
  }
},
  withRequestStatus((state: State) => state.deleteUser),
  withNotifications({ getSuccessMsg: () => 'User/s deleted successfully' }),

);

export const deleteUser = { action, reducer };

