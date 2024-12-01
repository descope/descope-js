/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['user']['getCustomAttributes']>,
  ThunkConfigExtraApi
>('customAttributes', (arg, { extra: { api } }) =>
  api.user.getCustomAttributes(),
);

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      state.customAttributes.data = action.payload;
    },
  },
  withRequestStatus((state: State) => state.customAttributes),
);

export const getCustomAttributes = { action, reducer };
