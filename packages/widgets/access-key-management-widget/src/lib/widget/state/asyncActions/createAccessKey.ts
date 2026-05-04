/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import {
  buildAsyncReducer,
  withNotifications,
  withRequestStatus,
} from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['accesskey']['create']>,
  ThunkConfigExtraApi
>('accessKeys/create', (arg, { extra: { api } }) => api.accesskey.create(arg));

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      state.accessKeysList.data.unshift(action.payload.key);
    },
  },
  withRequestStatus((state: State) => state.createAccessKey),
  withNotifications({
    getSuccessMsg: () => 'Access Key created successfully',
    getErrorMsg: (action) => ({
      msg: 'Failed to create access key',
      detail: action.error?.message,
    }),
  }),
);

export const createAccessKey = { action, reducer };
