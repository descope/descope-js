/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['passkey']['passkeys']>,
  ThunkConfigExtraApi
>('users/passkeys', (arg, { extra: { api } }) => api.passkey.passkeys(arg));

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      state.passkeys.data = action.payload.passkeys;
    },
  },
  withRequestStatus((state: State) => state.passkeys),
);

export const listPasskeys = { action, reducer };
