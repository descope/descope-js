/* eslint-disable no-param-reassign */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { pluralize } from '@descope/sdk-helpers';
import { Sdk } from '../../api/sdk';
import { FirstParameter, State, ThunkConfigExtraApi } from '../types';
import {
  buildAsyncReducer,
  withNotifications,
  withRequestStatus,
} from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['role']['deleteBatch']>,
  ThunkConfigExtraApi
>('roles/delete', (arg, { extra: { api } }) => api.role.deleteBatch(arg));

const reducer = buildAsyncReducer(action)(
  {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    onFulfilled: (state, action) => {
      state.rolesList.data = state.rolesList.data.filter(
        (role) =>
          role?.tenantId?.length === 0 || !action.meta.arg.includes(role.name),
      );
      state.selectedRolesIds = [];
    },
  },
  withRequestStatus((state: State) => state.deleteRole),
  // eslint-disable-next-line @typescript-eslint/no-shadow
  withNotifications({
    // eslint-disable-next-line @typescript-eslint/no-shadow
    getSuccessMsg: (action) =>
      pluralize(action.meta.arg.length)`${['', action.meta.arg.length]} ${[
        'R',
        'r',
      ]}ole${['', 's']} deleted successfully`,
    // eslint-disable-next-line @typescript-eslint/no-shadow
    getErrorMsg: (action) =>
      pluralize(action.meta.arg.length)`Failed to delete role${['', 's']}`,
  }),
);

export const deleteRoles = { action, reducer };
