import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['tenant']['getTenantRoles']>,
  ThunkConfigExtraApi
>('tenant/getTenantRoles', (_, { extra: { api } }) =>
  api.tenant.getTenantRoles(),
);

const reducer = buildAsyncReducer(action)(
  {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    onFulfilled: (state, action) => {
      // eslint-disable-next-line no-param-reassign
      state.tenantRoles.data = action.payload.roles;
    },
  },
  withRequestStatus((state: State) => state.tenantRoles),
);

export const getTenantRoles = { action, reducer };
