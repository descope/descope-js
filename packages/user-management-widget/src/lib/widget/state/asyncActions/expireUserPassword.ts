/* eslint-disable no-param-reassign */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Api } from '../../apiMixin/api';
import { FirstParameter, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer } from './helpers';

const action = createAsyncThunk
<any, FirstParameter<Api['user']['expirePassword']>, ThunkConfigExtraApi>
(
  'users/expirePassword',
  (arg, { extra: { api } }) => api.user.expirePassword(arg)
);

// eslint-disable-next-line @typescript-eslint/no-shadow
const reducer = buildAsyncReducer(action, (state) => state.expireUserPassword);

export const expireUserPassword = { action, reducer };

