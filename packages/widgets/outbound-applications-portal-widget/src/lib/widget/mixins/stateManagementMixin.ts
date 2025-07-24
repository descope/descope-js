/* eslint-disable no-param-reassign */
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  createStateManagementMixin,
  initLifecycleMixin,
  loggerMixin,
} from '@descope/sdk-mixins';
import {
  getAllOutboundApps,
  getConnectedOutboundApps,
  setAllowedAppsIds,
} from '../state/asyncActions';
import { initialState } from '../state/initialState';
import { apiMixin } from './apiMixin';
import { getMe } from '../state/asyncActions/getMe';

export const stateManagementMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      createStateManagementMixin({
        name: 'widget',
        initialState,
        reducers: {},
        extraReducers: (builder) => {
          getMe.reducer(builder);
          getConnectedOutboundApps.reducer(builder);
          getAllOutboundApps.reducer(builder);
          setAllowedAppsIds.reducer(builder);
        },
        asyncActions: {
          getMe: getMe.action,
          getOutboundApps: getAllOutboundApps.action,
          getConnectedOutboundApps: getConnectedOutboundApps.action,
          setAllowedAppsIds: setAllowedAppsIds.action,
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
