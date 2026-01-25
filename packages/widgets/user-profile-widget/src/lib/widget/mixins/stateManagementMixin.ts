/* eslint-disable no-param-reassign */
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  createStateManagementMixin,
  initLifecycleMixin,
  loggerMixin,
} from '@descope/sdk-mixins';
import {
  getMe,
  listDevices,
  logout,
  setCurrentTenant,
} from '../state/asyncActions';
import { initialState } from '../state/initialState';
import { apiMixin } from './apiMixin';

export const stateManagementMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      createStateManagementMixin({
        name: 'widget',
        initialState,
        reducers: {
          clearNotifications: (state) => {
            state.notifications = [];
          },
          setCurrentTenantId: (
            state,
            { payload }: { payload: string | null },
          ) => {
            state.tenant.currentTenantId = payload;
          },
        },
        extraReducers: (builder) => {
          getMe.reducer(builder);
          listDevices.reducer(builder);
          logout.reducer(builder);
          setCurrentTenant.reducer(builder);
        },
        asyncActions: {
          getMe: getMe.action,
          listDevices: listDevices.action,
          logout: logout.action,
          setCurrentTenant: setCurrentTenant.action,
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
