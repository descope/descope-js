/* eslint-disable no-param-reassign */
import { compose } from '../../helpers/compose';
import { createSingletonMixin } from '../../helpers/mixins';
import { createStateManagementMixin } from '../../mixins/createStateManagementMixin';
import { initLifecycleMixin } from '../../mixins/initLifecycleMixin';
import { loggerMixin } from '../../mixins/loggerMixin';
import {
  createRole,
  deleteRoles,
  searchRole,
  updateRole,
  getTenantPermissions,
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

        this.subscribe((state) => {
          this.logger.debug('State update:', state);
          this.state = state;
        });
      }
    };
  },
);
