/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer } from './helpers';
import { decodeJWT } from '@descope/sdk-helpers';

const action = createAsyncThunk<
  { dct: string | null },
  void,
  ThunkConfigExtraApi
>('tenant/parseSessionToken', async (arg, { extra: { api } }) => {
  const sessionToken = api.getSessionToken();
  const claims = sessionToken ? decodeJWT(sessionToken) : null;

  return {
    dct: claims?.dct || null,
  };
});

const reducer = buildAsyncReducer(action)({
  onFulfilled: (state, action) => {
    state.tenant.currentTenantId = action.payload.dct;
  },
});

export const parseSessionToken = { action, reducer };
