/* eslint-disable no-param-reassign */
import { pluralize } from '@descope/sdk-helpers';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, notifyOn, withRequestStatus } from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['accesskey']['deleteBatch']>,
  ThunkConfigExtraApi
>('accessKeys/delete', (arg, { extra: { api } }) =>
  api.accesskey.deleteBatch(arg),
);

const reducer = buildAsyncReducer(action)(
  {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    onFulfilled: (state, action) => {
      state.accessKeysList.data = state.accessKeysList.data.filter(
        (accessKey) => !action.meta.arg.includes(accessKey.id),
      );
      state.selectedAccessKeysIds = [];
    },
  },
  withRequestStatus((state: State) => state.deleteAccessKey),
);

notifyOn(action, {
  getSuccessMsg: (settled) =>
    pluralize(settled.meta.arg.length)`${['', settled.meta.arg.length]} ${[
      'A',
      'a',
    ]}ccess key${['', 's']} deleted successfully`,
  getErrorMsg: (settled) =>
    pluralize(settled.meta.arg.length)`Failed to delete access key${['', 's']}`,
});

export const deleteAccessKeys = { action, reducer };
