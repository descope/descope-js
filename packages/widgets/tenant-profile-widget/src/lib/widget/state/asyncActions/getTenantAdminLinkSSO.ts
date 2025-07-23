/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['tenant']['adminLinkSso']>,
  ThunkConfigExtraApi
>('tenant/adminLinkSso', (arg, { extra: { api } }) =>
  api.tenant.adminLinkSso(),
);

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      state.tenantAdminLinkSSO.data =
        action.payload?.adminSSOConfigurationLink || '';
    },
  },
  withRequestStatus((state: State) => state.tenantAdminLinkSSO),
);

export const getTenantAdminLinkSSO = { action, reducer };
