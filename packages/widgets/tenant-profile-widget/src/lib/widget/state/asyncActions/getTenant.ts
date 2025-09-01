/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['tenant']['details']>,
  ThunkConfigExtraApi
>('tenant/details', (arg, { extra: { api } }) => api.tenant.details());

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      state.tenant.data = action.payload;
    },
  },
  withRequestStatus((state: State) => state.tenant),
);

export const getTenant = { action, reducer };
