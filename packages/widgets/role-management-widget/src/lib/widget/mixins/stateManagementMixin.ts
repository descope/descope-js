/* eslint-disable no-param-reassign */
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  createStateManagementMixin,
  initLifecycleMixin,
  loggerMixin,
} from '@descope/sdk-mixins';
import {
  createRole,
  deleteRoles,
  getTenantPermissions,
  searchRole,
  updateRole,
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
          setSelectedRolesIds: (state, { payload }) => {
            state.selectedRolesIds = payload;
          },
          clearNotifications: (state) => {
            state.notifications = [];
          },
        },
        extraReducers: (builder) => {
          createRole.reducer(builder);
          updateRole.reducer(builder);
          deleteRoles.reducer(builder);
          searchRole.reducer(builder);
          getTenantPermissions.reducer(builder);
        },
        asyncActions: {
          searchRoles: searchRole.action,
          createRole: createRole.action,
          updateRole: updateRole.action,
          deleteRoles: deleteRoles.action,
          getTenantPermissions: getTenantPermissions.action,
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

        this.subscribe((state: typeof initialState) => {
          this.logger.debug('State update:', state);
          this.state = state;
        });
      }
    };
  },
);
