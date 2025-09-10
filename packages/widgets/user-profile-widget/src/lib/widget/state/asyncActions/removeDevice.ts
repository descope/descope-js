/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { buildAsyncReducer, withNotifications } from './helpers';

const action = createAsyncThunk<any, { success: boolean }>(
  'users/removeDevice',
  (arg) => {
    // Mock success/failure only; no real API call or state mutation here.
    if (arg.success) return Promise.resolve();
    return Promise.reject(new Error('Failed to remove device'));
  },
);

const reducer = buildAsyncReducer(action)(
  withNotifications({
    getSuccessMsg: () => 'Device removed successfully',
    getErrorMsg: () => {
      return `
      <div>
        <div>Failed to remove device</div>
      </div>`;
    },
  }),
);

export const removeDevice = { action, reducer };
