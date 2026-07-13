/* eslint-disable no-param-reassign */
import { pluralize } from '@descope/sdk-helpers';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, notifyOn, withRequestStatus } from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['accesskey']['activate']>,
  ThunkConfigExtraApi
>('accessKeys/activate', (arg, { extra: { api } }) =>
  api.accesskey.activate(arg),
);

const reducer = buildAsyncReducer(action)(
  {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    onFulfilled: (state, action) => {
      state.accessKeysList.data.forEach((accessKey) => {
        if (action.meta.arg.includes(accessKey.id)) {
          accessKey.status = 'active';
        }
      });
    },
  },
  withRequestStatus((state: State) => state.activateAccessKey),
);

notifyOn(action, {
  getSuccessMsg: (settled) =>
    pluralize(settled.meta.arg.length)`${['', settled.meta.arg.length]} ${[
      'A',
      'a',
    ]}ccess key${['', 's']} activated successfully`,
  getErrorMsg: (settled) =>
    pluralize(settled.meta.arg.length)`Failed to activate access key${[
      '',
      's',
    ]}`,
});

export const activateAccessKeys = { action, reducer };
