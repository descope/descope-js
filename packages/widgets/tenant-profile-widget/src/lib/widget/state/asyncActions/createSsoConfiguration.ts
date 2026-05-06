/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer } from './helpers';
import { getSsoConfigurations } from './getSsoConfigurations';

type CreateSsoConfigArg = { name: string; id?: string };

const action = createAsyncThunk<any, CreateSsoConfigArg, ThunkConfigExtraApi>(
  'tenant/createSsoConfiguration',
  async ({ name, id }, { extra: { api }, dispatch }) => {
    await api.tenant.createSsoConfig({ name, id });
    dispatch(getSsoConfigurations.action());
  },
);

const reducer = buildAsyncReducer(action)({});

export const createSsoConfiguration = { action, reducer };
