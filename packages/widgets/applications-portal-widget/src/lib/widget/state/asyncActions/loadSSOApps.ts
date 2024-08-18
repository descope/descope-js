/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['ssoApps']['load']>,
  ThunkConfigExtraApi
>('ssoApps/load', (arg, { extra: { api } }) => api.ssoApps.load());

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      state.ssoAppsList.data = action.payload;
    },
  },
  withRequestStatus((state: State) => state.ssoAppsList),
);

export const loadSSOApps = { action, reducer };
