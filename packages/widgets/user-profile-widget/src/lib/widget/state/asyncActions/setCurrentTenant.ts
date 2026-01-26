/* eslint-disable no-param-reassign */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';

const action = createAsyncThunk<
  void,
  FirstParameter<Sdk['user']['setCurrentTenant']>,
  ThunkConfigExtraApi
>('user/setCurrentTenant', async (tenantId, { extra: { api }, getState }) => {
  const state = getState() as State;
  const prevTenantId = state.tenant.currentTenantId;

  if (!tenantId || tenantId === prevTenantId) {
    return;
  }

  await api.user.setCurrentTenant(tenantId);
});

export const setCurrentTenant = { action };
