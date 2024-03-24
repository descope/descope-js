/* eslint-disable no-param-reassign */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';
import { getSearchParams } from '../selectors';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['accesskey']['search']> | void,
  ThunkConfigExtraApi
>('accessKeys/search', (arg, { extra: { api }, getState }) => {
  // we get the existing search params from state, and adding the new search params from the action
  const searchParams = getSearchParams(getState() as State);
  return api.accesskey.search({ ...searchParams, ...arg });
});

const reducer = buildAsyncReducer(action)(
  {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    onPending: (state, action) => {
      state.searchParams = { ...state.searchParams, ...action.meta.arg };
    },
    // eslint-disable-next-line @typescript-eslint/no-shadow
    onFulfilled: (state, action) => {
      state.accessKeysList.data = action.payload;
    },
  },
  withRequestStatus((state: State) => state.accessKeysList),
);

export const searchAccessKeys = { action, reducer };
