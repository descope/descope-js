/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['tenant']['selectTenant']>,
  ThunkConfigExtraApi
>('tenant/select', async (tenantId, { extra: { api } }) => {
  const result = await api.tenant.selectTenant(tenantId);

  // After selecting tenant, refresh user data to get updated claims
  await api.user.me();

  return { tenantId, ...result };
});

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      state.tenant.currentTenantId = action.payload.tenantId;
    },
  },
  withRequestStatus((state: State) => state.tenant),
);

export const selectTenant = { action, reducer };
