/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { buildAsyncReducer, withNotifications } from './helpers';

const action = createAsyncThunk<any, { success: boolean }>(
  'users/removeDevice',
  (arg) => {
    // Since we don't get a response for remove device action, we need to
    // mock success/failure operation. No real API call or state mutation here,
    // just a resolve/reject for triggering a notification.
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
