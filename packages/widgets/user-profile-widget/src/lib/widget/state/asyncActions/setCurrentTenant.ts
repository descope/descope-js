/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer } from './helpers';
import { parseSessionToken } from './parseSessionToken';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['user']['setCurrentTenant']>,
  ThunkConfigExtraApi
>('user/setCurrentTenant', async (tenantId, { extra: { api }, dispatch }) => {
  // Select a tenant and update the session token
  await api.user.setCurrentTenant(tenantId);

  // After switching tenants, parse the JWT to extract the new dct claim
  await dispatch(parseSessionToken.action());
});

const reducer = buildAsyncReducer(action)({});

export const setCurrentTenant = { action, reducer };
