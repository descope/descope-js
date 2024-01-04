/* eslint-disable no-param-reassign */
import { createSlice, configureStore, CreateSliceOptions, SliceCaseReducers, SliceSelectors } from '@reduxjs/toolkit';
import { createSingletonMixin } from '../helpers/mixins';

// TODO: do we need redux toolkit? or we can go with redux core and save some bundle size?
export const createStateManagementMixin =
  <State, CaseReducers extends SliceCaseReducers<State>, Name extends string, Selectors extends SliceSelectors<State>, ReducerPath extends string = Name>
    (options: CreateSliceOptions<State, CaseReducers, Name, ReducerPath, Selectors>) => {

    // TODO: do we need multiple slices?
    const slice = createSlice(options);

    const store = configureStore({
      reducer: slice.reducer
    });

    const wrapAction = <F extends (...args: any[]) => any>(action: F) => (...arg: any[]) => store.dispatch(action(...arg)) as T;

    const actions = Object.keys(slice.actions).reduce((acc, actionName) => {
      acc[actionName] = wrapAction(slice.actions[actionName]);

      return acc;
    }, {}) as typeof slice.actions;

    return createSingletonMixin(
      <T extends CustomElementConstructor>(superclass: T) =>
        class StateManagementMixinClass extends superclass {

          // eslint-disable-next-line class-methods-use-this
          subscribe = (cb: (state: any) => void) => store.subscribe(() => cb(store.getState()));

          actions = actions;
        },
    );
  };
