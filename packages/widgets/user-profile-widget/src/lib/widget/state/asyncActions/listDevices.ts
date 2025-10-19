/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['device']['devices']>,
  ThunkConfigExtraApi
>('users/devices', (arg, { extra: { api } }) => api.device.devices(arg));

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      state.devices.data = action.payload.devices;
    },
  },
  withRequestStatus((state: State) => state.devices),
);

export const listDevices = { action, reducer };
