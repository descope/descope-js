/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, ThunkConfigExtraApi } from '../types';
import { parseSessionToken } from './parseSessionToken';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['user']['setCurrentTenant']>,
  ThunkConfigExtraApi
>('user/setCurrentTenant', async (tenantId, { extra: { api }, dispatch }) => {
  // Update dct in session token
  await api.user.setCurrentTenant(tenantId);

  // Update state
  await dispatch(parseSessionToken.action());
});

export const setCurrentTenant = { action };
