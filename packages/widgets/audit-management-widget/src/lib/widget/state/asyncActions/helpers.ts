/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-param-reassign */

import {
  ActionReducerMapBuilder,
  AsyncThunk,
  PayloadAction,
  SerializedError,
} from '@reduxjs/toolkit';
import { State } from '../types';

type ExtractedArg<T> = T extends AsyncThunk<any, infer U, any> ? U : never;

type FulfilledAction<T extends AsyncThunk<any, any, any>> = PayloadAction<
  any,
  string,
  {
    arg: ExtractedArg<T>;
    requestId: string;
  },
  never
>;

type RejectedAction<T extends AsyncThunk<any, any, any>> = PayloadAction<
  any,
  string,
  {
    arg: ExtractedArg<T>;
    requestId: string;
  },
  SerializedError
>;

type PendingAction<T extends AsyncThunk<any, any, any>> = PayloadAction<
  unknown,
  string,
  {
    arg: ExtractedArg<T>;
    requestId: string;
  }
>;

type AsyncReducerConfig<T extends AsyncThunk<any, any, any>> = {
  onFulfilled?: (state: State, action: FulfilledAction<T>) => void;
  onRejected?: (state: State, action: RejectedAction<T>) => void;
  onPending?: (state: State, action: PendingAction<T>) => void;
};

export const buildAsyncReducer =
  <T extends AsyncThunk<any, any, any>>(action: T) =>
  (...args: AsyncReducerConfig<T>[]) =>
  (builder: ActionReducerMapBuilder<State>) => {
    builder.addCase(action.pending, (state, action) => {
      args.forEach(({ onPending }) => {
        onPending?.(state, action);
      });
    });

    builder.addCase(action.fulfilled, (state, action) => {
      args.forEach(({ onFulfilled }) => {
        onFulfilled?.(state, action);
      });
    });

    builder.addCase(action.rejected, (state, action) => {
      args.forEach(({ onRejected }) => {
        onRejected?.(state, action);
      });
    });
  };

export const withRequestStatus = (
  getStateSection: (state: State) => { loading: boolean; error: unknown },
): AsyncReducerConfig<any> => ({
  onFulfilled: (state) => {
    getStateSection(state).loading = false;
  },
  onPending: (state) => {
    getStateSection(state).loading = true;
    getStateSection(state).error = null;
  },
  onRejected: (state, action) => {
    getStateSection(state).loading = false;
    getStateSection(state).error = action.error;
  },
});
