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
import { getCurrentTenantId } from '../selectors';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['user']['setCurrentTenant']>,
  ThunkConfigExtraApi
>('tenant/select', async (tenantId, { extra: { api }, getState }) => {
  const currentTenantId = getCurrentTenantId(getState() as State);

  if (tenantId === currentTenantId) {
    return null;
  }

  // save previous tenant id
  const response = await api.user.setCurrentTenant(tenantId);

  // Parse the JWT from the response to extract the DCT
  const sessionToken = response.sessionJwt || response.sessionToken;

  try {
    const dct = extractDctFromToken(sessionToken);
    return { tenantId: dct };
  } catch (error) {
    console.error('Failed to switch tenant:', error);
    return null;
  }
});

const reducer = buildAsyncReducer(action)(
  {
    onPending: (state) => {
      // Save previous value for potential rollback
      state.tenant.previousTenantId = state.tenant.currentTenantId;
    },
    onFulfilled: (state, action) => {
      // Success: update tenant and clear previous
      state.tenant.currentTenantId = action.payload?.tenantId;
      state.tenant.previousTenantId = null;
    },
    onRejected: (state) => {
      // Error: revert to previous value
      state.tenant.currentTenantId = state.tenant.previousTenantId;
      state.tenant.previousTenantId = null;
    },
  },
  withRequestStatus((state: State) => state.selectTenant),
  withNotifications({
    getErrorMsg: (action) => {
      const errorMsg = action.error?.message || '';
      if (action.error?.name === 'Error') {
        return errorMsg;
      }
      return `${errorMsg || 'Error'}`;
    },
  }),
);

export const selectTenant = { action, reducer };
