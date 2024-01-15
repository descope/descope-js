/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-param-reassign */

import { ActionReducerMapBuilder, AsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { State } from '../types';

type ExtractedArg<T> = T extends AsyncThunk<any, infer U, any> ? U : never;

export const buildAsyncReducer = <T extends AsyncThunk<any, any, any>>(
  action: T,
  getStatusStateSection: (state: State) => { loading: boolean, error: unknown },
  onFulfilled?: (state: State, action: PayloadAction<any, string, {
    arg:ExtractedArg<T>;
    requestId: string;
    requestStatus: 'fulfilled';
  }, never>) => void
) => (builder: ActionReducerMapBuilder<State>) => {
  builder.addCase(action.pending, (state) => {
    getStatusStateSection(state).loading = true;
    getStatusStateSection(state).error = null;
  });
  builder.addCase(action.fulfilled, (state, action) => {
    getStatusStateSection(state).loading = false;
    onFulfilled?.(state, action);
  });
  builder.addCase(action.rejected, (state, action) => {
    getStatusStateSection(state).loading = false;
    getStatusStateSection(state).error = action.error;
  });
};
