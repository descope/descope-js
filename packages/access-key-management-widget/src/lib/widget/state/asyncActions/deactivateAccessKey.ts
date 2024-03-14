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
  FirstParameter<Sdk['accesskey']['deactivate']>,
  ThunkConfigExtraApi
>('accessKeys/deactivate', (arg, { extra: { api } }) =>
  api.accesskey.deactivate(arg),
);

const reducer = buildAsyncReducer(action)(
  {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    onFulfilled: (state) => {
      state.accessKeysList.data.forEach((accessKey) => {
        accessKey.status = 'inactive';
      });
    },
  },
  withRequestStatus((state: State) => state.deactivateAccessKey),
  // eslint-disable-next-line @typescript-eslint/no-shadow
  withNotifications({
    // eslint-disable-next-line @typescript-eslint/no-shadow
    getSuccessMsg: (action) =>
      pluralize(action.meta.arg.length)`${['', action.meta.arg.length]} ${[
        'A',
        'a',
      ]}cess key${['', 's']} deactivated successfully`,
    // eslint-disable-next-line @typescript-eslint/no-shadow
    getErrorMsg: (action) =>
      pluralize(action.meta.arg.length)`Failed to deactivate access key${[
        '',
        's',
      ]}`,
  }),
);

export const deactivateAccessKeys = { action, reducer };
