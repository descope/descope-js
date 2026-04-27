import { createAsyncThunk } from '@reduxjs/toolkit';
import { State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';

const action = createAsyncThunk<any, void, ThunkConfigExtraApi>(
  'tenant/getSubTenantRoles',
  (_, { extra: { api } }) => api.tenant.getSubTenantRoles(),
);

const reducer = buildAsyncReducer(action)(
  {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    onFulfilled: (state, action) => {
      // eslint-disable-next-line no-param-reassign
      state.subTenantRoles.data = action.payload.roles;
    },
  },
  withRequestStatus((state: State) => state.subTenantRoles),
);

export const getSubTenantRoles = { action, reducer };
