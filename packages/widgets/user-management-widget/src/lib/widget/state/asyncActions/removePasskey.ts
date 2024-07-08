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
  FirstParameter<Sdk['user']['removePasskey']>,
  ThunkConfigExtraApi
>('users/removePasskey', (arg, { extra: { api } }) =>
  api.user.removePasskey(arg),
);

const reducer = buildAsyncReducer(action)(
  withRequestStatus((state: State) => state.removePasskey),
  withNotifications({
    getSuccessMsg: () => `Successfully removed user's passkey`,
    getErrorMsg: (action) => {
      const errorMsg = action.error?.message;
      return `
      <div>
        <div>Failed to remove user's passkey</div>
        ${errorMsg}
      </div>`;
    },
  }),
);

export const removePasskey = { action, reducer };
