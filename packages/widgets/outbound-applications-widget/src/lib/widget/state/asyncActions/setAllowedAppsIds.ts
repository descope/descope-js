/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer } from './helpers';

const action = createAsyncThunk<string[], string[], ThunkConfigExtraApi>(
  'allowedAppsIds/set',
  async (ids) => {
    if (!ids.length) return [];
    return ids;
  },
);

const reducer = buildAsyncReducer(action)({
  onFulfilled: (state, action) => {
    state.allowedAppsIds.data = action.payload;
  },
});

export const setAllowedAppsIds = { action, reducer };
