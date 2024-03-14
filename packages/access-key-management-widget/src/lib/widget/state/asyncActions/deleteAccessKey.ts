/* eslint-disable no-param-reassign */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import {
  buildAsyncReducer,
  withNotifications,
  withRequestStatus,
} from './helpers';
import { pluralize } from '../../../helpers/generic';

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
  // eslint-disable-next-line @typescript-eslint/no-shadow
  withNotifications({
    // eslint-disable-next-line @typescript-eslint/no-shadow
    getSuccessMsg: (action) =>
      pluralize(action.meta.arg.length)`${['', action.meta.arg.length]} ${[
        'A',
        'a',
      ]}cess key${['', 's']} deleted successfully`,
    // eslint-disable-next-line @typescript-eslint/no-shadow
    getErrorMsg: (action) =>
      pluralize(action.meta.arg.length)`Failed to delete access key${[
        '',
        's',
      ]}`,
  }),
);

export const deleteAccessKeys = { action, reducer };
