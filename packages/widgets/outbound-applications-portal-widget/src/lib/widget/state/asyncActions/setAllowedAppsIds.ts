/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';

const action = createAsyncThunk<string[], string, ThunkConfigExtraApi>(
  'allowedAppsIds/set',
  async (attributeValue) => {
    if (typeof attributeValue !== 'string') {
      return [];
    }

    return attributeValue
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  },
);

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      state.allowedAppsIds.data = action.payload;
    },
  },
  withRequestStatus((state: State) => state.allowedAppsIds),
);

export const setAllowedAppsIds = { action, reducer };
