/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';
import { decodeJWT } from '../../helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['user']['me']>,
  ThunkConfigExtraApi
>('users/me', async (arg, { extra: { api } }) => {
  const userData = await api.user.me();

  // Get current tenant ID from session JWT
  const sessionToken = api.getSessionToken();
  const claims = sessionToken ? decodeJWT(sessionToken) : null;

  return {
    ...userData,
    dct: claims?.dct,
  };
});

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      state.me.data = action.payload;
      // Set current tenant ID from the JWT's dct claim (if it exists)
      if (action.payload?.dct) {
        state.tenant.currentTenantId = action.payload.dct;
      } else {
        // If no dct in JWT, set to null (user hasn't selected a tenant or has no tenant)
        state.tenant.currentTenantId = null;
      }
    },
  },
  withRequestStatus((state: State) => state.me),
);

export const getMe = { action, reducer };
