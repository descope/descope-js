/* eslint-disable no-param-reassign */
import { createSlice, configureStore, unwrapResult } from '@reduxjs/toolkit';
import type {
  CreateSliceOptions,
  Draft,
  SliceCaseReducers,
  SliceSelectors,
} from '@reduxjs/toolkit';
import type { Unsubscribe } from 'redux'; //  workaround for https://github.com/microsoft/TypeScript/issues/42873
import { createSingletonMixin } from '../helpers/mixins';
import { compose } from '../helpers/compose';
import { loggerMixin } from './loggerMixin';

export const createStateManagementMixin = <
  State,
  CaseReducers extends SliceCaseReducers<State>,
  Name extends string,
  Selectors extends SliceSelectors<State>,
  ReducerPath extends string = Name,
  AsyncActions extends Record<string, any> = {},
>(
  options: CreateSliceOptions<
    State,
    CaseReducers,
    Name,
    ReducerPath,
    Selectors
  > & { asyncActions?: AsyncActions },
) =>
  createSingletonMixin(<T extends CustomElementConstructor>(superclass: T) => {
    const slice = createSlice(options);

    const allActions = { ...slice.actions, ...options.asyncActions };

    return class StateManagementMixinClass extends compose(loggerMixin)(
      superclass,
    ) {
      actions: typeof allActions;

      subscribe: <SelectorR = State extends Draft<infer S> ? S : State>(
        cb: (state: SelectorR) => void,
        selector?: (state: State) => SelectorR,
      ) => Unsubscribe;

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
          devTools: false,
        });

        const wrapAction = <F extends (...args: any[]) => any>(action: F) =>
          (async (...arg: any[]) => {
            const result = await store.dispatch(action(...arg));

            // we want to unwrap the result, so in case of an error we can log it
            try {
              unwrapResult(result);
            } catch (e) {
              this.logger.error(e.message, result.type, e.stack);
            }

            return result;
          }) as F;

        const actions = Object.keys(allActions).reduce((acc, actionName) => {
          acc[actionName] = wrapAction(allActions[actionName]);

          return acc;
        }, {}) as typeof slice.actions & typeof options.asyncActions;

        this.actions = actions;

        this.subscribe = (cb, selector = (state) => state as any) =>
          store.subscribe(() => cb(selector(store.getState())));
      }
    };
  });
