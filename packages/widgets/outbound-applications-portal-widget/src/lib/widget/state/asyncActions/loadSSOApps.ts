/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['outboundApps']['load']>,
  ThunkConfigExtraApi
>('outboundApps/load', (arg, { extra: { api } }) => api.outboundApps.load());

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      state.outboundAppsList.data = action.payload?.apps;
    },
  },
  withRequestStatus((state: State) => state.outboundAppsList),
);

export const loadOutboundApps = { action, reducer };
