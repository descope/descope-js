/* eslint-disable no-param-reassign */
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  createStateManagementMixin,
  initLifecycleMixin,
  loggerMixin,
} from '@descope/sdk-mixins';
import { loadSSOApps } from '../state/asyncActions';
import { initialState } from '../state/initialState';
import { apiMixin } from './apiMixin';

export const stateManagementMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      createStateManagementMixin({
        name: 'widget',
        initialState,
        reducers: {},
        extraReducers: (builder) => {
          loadSSOApps.reducer(builder);
        },
        asyncActions: {
          loadSSOApps: loadSSOApps.action,
        },
      }),
      initLifecycleMixin,
      loggerMixin,
      apiMixin,
    )(superclass);
    return class StateManagementMixinClass extends BaseClass {
      state = initialState;

      constructor(...args: any) {
        super(...args);

        this.subscribe((state) => {
          this.logger.debug('State update:', state);
          this.state = state;
        });
      }
    };
  },
);
