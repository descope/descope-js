/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';

const action = createAsyncThunk<any, void, ThunkConfigExtraApi>(
  'tenant/getSsoConfigurations',
  (_, { extra: { api } }) => api.tenant.listSsoConfigs(),
);

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      state.ssoConfigurations.data = action.payload?.configurations ?? [];
    },
  },
  withRequestStatus((state: State) => state.ssoConfigurations),
);

export const getSsoConfigurations = { action, reducer };
