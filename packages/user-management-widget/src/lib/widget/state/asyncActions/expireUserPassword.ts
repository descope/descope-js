/* eslint-disable no-param-reassign */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';

const action = createAsyncThunk
  <any, FirstParameter<Sdk['user']['expirePassword']>, ThunkConfigExtraApi>
  (
    'users/expirePassword',
    (arg, { extra: { api } }) => api.user.expirePassword(arg)
  );

// eslint-disable-next-line @typescript-eslint/no-shadow
const reducer = buildAsyncReducer(action)(
  withRequestStatus((state: State) => state.expireUserPassword)
  );

export const expireUserPassword = { action, reducer };

