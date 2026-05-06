/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer } from './helpers';
import { getSsoConfigurations } from './getSsoConfigurations';

type DeleteSsoConfigArg = { id: string };

const action = createAsyncThunk<any, DeleteSsoConfigArg, ThunkConfigExtraApi>(
  'tenant/deleteSsoConfiguration',
  async ({ id }, { extra: { api }, dispatch }) => {
    await api.tenant.deleteSsoConfig({ id });
    dispatch(getSsoConfigurations.action());
  },
);

const reducer = buildAsyncReducer(action)({});

export const deleteSsoConfiguration = { action, reducer };
