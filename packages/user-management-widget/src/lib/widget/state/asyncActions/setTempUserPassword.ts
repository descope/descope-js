/* eslint-disable no-param-reassign */
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
  FirstParameter<Sdk['user']['setTempPassword']>,
  ThunkConfigExtraApi
>('users/setTempPassword', (arg, { extra: { api } }) =>
  api.user.setTempPassword(arg),
);

// eslint-disable-next-line @typescript-eslint/no-shadow
const reducer = buildAsyncReducer(action)(
  withRequestStatus((state: State) => state.setTempUserPassword),
  withNotifications({
    getSuccessMsg: () => `Successfully reset user password`,
    // eslint-disable-next-line @typescript-eslint/no-shadow
    getErrorMsg: (action) => {
      const errorMsg = action.error?.message;
      return `
      <div>
        <div>Failed to reset user's password</div>
        ${errorMsg}
      </div>`;
    },
  }),
);

export const setTempUserPassword = { action, reducer };
