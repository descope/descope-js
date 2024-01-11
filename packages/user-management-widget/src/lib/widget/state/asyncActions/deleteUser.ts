/* eslint-disable no-param-reassign */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Api } from '../../apiMixin/api';
import { FirstParameter, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer } from './helpers';

const action = createAsyncThunk
<any, FirstParameter<Api['user']['delete']>, ThunkConfigExtraApi>
(
  'users/delete',
  (arg, { extra: { api } }) => api.user.delete(arg)
);

// eslint-disable-next-line @typescript-eslint/no-shadow
const reducer = buildAsyncReducer(action, (state) => state.deleteUser, (state, action) => {
  state.usersList.data = state.usersList.data.filter(user => !user.loginIds.every(loginId => action.meta.arg.includes(loginId)));
  state.selectedUsersIds = state.selectedUsersIds.filter(loginIds => !loginIds.every(loginId => action.meta.arg.includes(loginId)));
});

export const deleteUser = { action, reducer };

