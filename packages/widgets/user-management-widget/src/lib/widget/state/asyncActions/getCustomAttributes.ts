import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['user']['getCustomAttributes']>,
  ThunkConfigExtraApi
>('users/getCustomAttributes', (_, { extra: { api } }) =>
  api.user.getCustomAttributes(),
);

const reducer = buildAsyncReducer(action)(
  {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    onFulfilled: (state, action) => {
      // eslint-disable-next-line no-param-reassign
      state.customAttributes.data = action.payload;
    },
  },
  withRequestStatus((state: State) => state.customAttributes),
);

export const getCustomAttributes = { action, reducer };
