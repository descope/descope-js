/* eslint-disable no-param-reassign */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import {
  FirstParameter,
  RemoveVoid,
  State,
  ThunkConfigExtraApi,
} from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['user']['search']> | void,
  ThunkConfigExtraApi
>('users/search', (arg, { extra: { api } }) =>
  api.user.search(arg as RemoveVoid<typeof arg>),
);

const reducer = buildAsyncReducer(action)(
  {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    onFulfilled: (state, action) => {
      state.usersList.data = action.payload;
    },
  },
  withRequestStatus((state: State) => state.usersList),
);

export const searchUser = { action, reducer };
