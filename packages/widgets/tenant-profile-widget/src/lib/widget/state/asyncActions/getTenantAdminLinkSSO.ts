/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['tenant']['getTenantAdminLinkSSO']>,
  ThunkConfigExtraApi
>('tenant/getTenantAdminLinkSSO', (arg, { extra: { api } }) =>
  api.tenant.getTenantAdminLinkSSO(),
);

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      state.tenantAdminLinkSSO.data = action.payload;
    },
  },
  withRequestStatus((state: State) => state.tenantAdminLinkSSO),
);

export const getTenantAdminLinkSSO = { action, reducer };
