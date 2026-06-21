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
  FirstParameter<Sdk['accesskey']['rotate']>,
  ThunkConfigExtraApi
>('accessKeys/rotate', (arg, { extra: { api } }) => api.accesskey.rotate(arg));

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      const idx = state.accessKeysList.data.findIndex(
        (k) => k.id === action.payload.key.id,
      );
      if (idx >= 0) state.accessKeysList.data[idx] = action.payload.key;
    },
  },
  withRequestStatus((state: State) => state.rotateAccessKey),
  withNotifications({
    getSuccessMsg: () => 'Access key rotated successfully',
    getErrorMsg: (action) => {
      const errorMsg = action.error?.message;
      return `
      <div>
        <div>Failed to rotate access key</div>
        ${errorMsg}
      </div>`;
    },
  }),
);

export const rotateAccessKey = { action, reducer };
