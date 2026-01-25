/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer } from './helpers';

const action = createAsyncThunk<
  string | null,
  FirstParameter<Sdk['user']['setCurrentTenant']>,
  ThunkConfigExtraApi
>('user/setCurrentTenant', async (tenantId, { extra: { api }, getState }) => {
  const state = getState() as State;
  const prevTenantId = state.tenant.currentTenantId;

  if (!tenantId || tenantId === prevTenantId) {
    return prevTenantId;
  }

  // Update dct in session token
  await api.user.setCurrentTenant(tenantId);

  return tenantId;
});

const reducer = buildAsyncReducer(action)({
  onFulfilled: (state, action) => {
    state.tenant.currentTenantId = action.payload;
  },
});

export const setCurrentTenant = { action, reducer };
