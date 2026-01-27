/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { extractDctFromToken } from '../helpers';
import {
  buildAsyncReducer,
  withNotifications,
  withRequestStatus,
} from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['user']['setCurrentTenant']>,
  ThunkConfigExtraApi
>('tenant/select', async (tenantId, { extra: { api } }) => {
  const response = await api.user.setCurrentTenant(tenantId);

  // Parse the JWT from the response to extract the DCT
  const sessionToken = response.sessionJwt || response.sessionToken;
  const dct = extractDctFromToken(sessionToken);

  return { tenantId: dct };
});

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      state.tenant.currentTenantId = action.payload.tenantId;
    },
  },
  withRequestStatus((state: State) => state.selectTenant),
  withNotifications({
    getErrorMsg: (action) => {
      const errorMsg = action.error?.message || '';
      if (action.error?.name === 'Error') {
        return errorMsg;
      }
      return `<div>${errorMsg || 'Error'}</div>`;
    },
  }),
);

export const selectTenant = { action, reducer };
