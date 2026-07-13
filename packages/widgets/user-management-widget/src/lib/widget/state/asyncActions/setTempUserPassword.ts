/* eslint-disable no-param-reassign */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, notifyOn, withRequestStatus } from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['user']['setTempPassword']>,
  ThunkConfigExtraApi
>('users/setTempPassword', (arg, { extra: { api } }) =>
  api.user.setTempPassword(arg),
);

const reducer = buildAsyncReducer(action)(
  withRequestStatus((state: State) => state.setTempUserPassword),
);

notifyOn(action, {
  getSuccessMsg: () => `Successfully reset user password`,
  getErrorMsg: (settled) => ({
    msg: `Failed to reset user's password`,
    detail: settled.error?.message,
  }),
});

export const setTempUserPassword = { action, reducer };
