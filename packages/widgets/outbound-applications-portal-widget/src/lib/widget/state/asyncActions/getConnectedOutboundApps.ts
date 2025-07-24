/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['outboundApps']['getConnectedOutboundApps']>,
  ThunkConfigExtraApi
>('outboundApps/getConnectedOutboundApps', (arg, { extra: { api } }) =>
  api.outboundApps.getConnectedOutboundApps(arg),
);

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      state.connectedOutboundAppsIds.data = action.payload?.appIds;
    },
  },
  withRequestStatus((state: State) => state.connectedOutboundAppsIds),
);

export const getConnectedOutboundApps = { action, reducer };
