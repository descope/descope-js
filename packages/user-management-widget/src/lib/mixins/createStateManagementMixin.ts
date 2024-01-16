/* eslint-disable no-param-reassign */
import { createSlice, configureStore } from '@reduxjs/toolkit';
import type { CreateSliceOptions, SliceCaseReducers, SliceSelectors } from '@reduxjs/toolkit';
import type { Unsubscribe } from 'redux'; //  workaround for https://github.com/microsoft/TypeScript/issues/42873
import { createSingletonMixin } from '../helpers/mixins';

export const createStateManagementMixin = <State, CaseReducers extends SliceCaseReducers<State>, Name extends string, Selectors extends SliceSelectors<State>, ReducerPath extends string = Name, AsyncActions extends Record<string, any> = {}>
  (options: CreateSliceOptions<State, CaseReducers, Name, ReducerPath, Selectors> & { asyncActions?: AsyncActions }) => createSingletonMixin(
    <T extends CustomElementConstructor>(superclass: T) => {
      const slice = createSlice(options);

      const allActions = { ...slice.actions, ...options.asyncActions };

      return class StateManagementMixinClass extends superclass {
        actions: typeof allActions;

        subscribe: (cb: (state: any) => void) => Unsubscribe;

        constructor(...args: any) {
          super(...args);

          const store = configureStore({
            reducer: slice.reducer,
            middleware: (getDefaultMiddleware) =>
              getDefaultMiddleware({
                thunk: {
                  extraArgument: this,
                },
                serializableCheck: false,
              }),
              // change to true if we want to debug redux
              devTools: false
          });

          const wrapAction = <F extends (...args: any[]) => any>(action: F) =>
            (...arg: any[]) => store.dispatch(action(...arg)) as F;


          const actions = Object.keys(allActions).reduce((acc, actionName) => {
            acc[actionName] = wrapAction(allActions[actionName]);

            return acc;
          }, {}) as typeof slice.actions & typeof options.asyncActions;

          this.actions = actions;

          this.subscribe = (cb: (state: any) => void) => store.subscribe(() => cb(store.getState()));
        }
      };
    },
  );
