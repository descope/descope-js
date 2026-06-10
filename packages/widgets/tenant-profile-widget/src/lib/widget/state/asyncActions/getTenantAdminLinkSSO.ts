/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-param-reassign */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { TenantAdminLinkSSOResponse } from '../../api/types';
import { State, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer, withRequestStatus } from './helpers';

const action = createAsyncThunk<
  TenantAdminLinkSSOResponse,
  { ssoIds: string[] },
  ThunkConfigExtraApi & { state: State }
>('tenant/adminLinkSso', ({ ssoIds }, { extra: { api } }) => {
  return api.tenant.adminLinkSso({ ssoIds });
});

const reducer = buildAsyncReducer(action)(
  {
    onFulfilled: (state, action) => {
      state.tenantAdminLinkSSO.data = action.payload ?? {
        defaultLink: '',
        ssoIdToLink: {},
      };
    },
  },
  withRequestStatus((state: State) => state.tenantAdminLinkSSO),
);

export const getTenantAdminLinkSSO = { action, reducer };
