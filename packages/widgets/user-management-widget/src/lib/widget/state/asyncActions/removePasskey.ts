/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, notifyOn, withRequestStatus } from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['user']['removePasskey']>,
  ThunkConfigExtraApi
>('users/removePasskey', (arg, { extra: { api } }) =>
  api.user.removePasskey(arg),
);

const reducer = buildAsyncReducer(action)(
  withRequestStatus((state: State) => state.removePasskey),
);

notifyOn(action, {
  getSuccessMsg: () => `Successfully removed user's passkey`,
  getErrorMsg: (action) => ({
    msg: `Failed to remove user's passkey`,
    detail: action.error?.message,
  }),
});

export const removePasskey = { action, reducer };
