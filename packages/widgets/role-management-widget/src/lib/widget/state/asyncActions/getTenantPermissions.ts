import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['tenant']['getTenantPermissions']>,
  ThunkConfigExtraApi
>('tenant/getTenantPermissions', (_, { extra: { api } }) =>
  api.tenant.getTenantPermissions(),
);

const reducer = buildAsyncReducer(action)(
  {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    onFulfilled: (state, action) => {
      // eslint-disable-next-line no-param-reassign
      state.tenantPermissions.data = action.payload.permissions;
    },
  },
  withRequestStatus((state: State) => state.tenantPermissions),
);

export const getTenantPermissions = { action, reducer };
