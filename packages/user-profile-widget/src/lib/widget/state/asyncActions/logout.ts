/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { Sdk } from '../../api/sdk';
import { FirstParameter, ThunkConfigExtraApi } from '../types';
import { buildAsyncReducer } from './helpers';

const action = createAsyncThunk<
  any,
  FirstParameter<Sdk['user']['logout']>,
  ThunkConfigExtraApi
>('users/logout', (arg, { extra: { api } }) => api.user.logout());

const reducer = buildAsyncReducer(action)({
});

export const logout = { action, reducer };
