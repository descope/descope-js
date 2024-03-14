/* eslint-disable no-param-reassign */
import { compose } from '../../helpers/compose';
import { createSingletonMixin } from '../../helpers/mixins';
import { createStateManagementMixin } from '../../mixins/createStateManagementMixin';
import { initLifecycleMixin } from '../../mixins/initLifecycleMixin';
import { loggerMixin } from '../../mixins/loggerMixin';
import {
  createAccessKey,
  deleteAccessKeys,
  searchAccessKeys,
  activateAccessKeys,
  deactivateAccessKeys,
  getTenantRoles,
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
          setSelectedAccessKeysIds: (state, { payload }) => {
            state.selectedAccessKeysIds = payload;
          },
          clearNotifications: (state) => {
            state.notifications = [];
          },
        },
        extraReducers: (builder) => {
          createAccessKey.reducer(builder);
          deleteAccessKeys.reducer(builder);
          searchAccessKeys.reducer(builder);
          activateAccessKeys.reducer(builder);
          deactivateAccessKeys.reducer(builder);
          getTenantRoles.reducer(builder);
        },
        asyncActions: {
          searchAccessKeys: searchAccessKeys.action,
          createAccessKey: createAccessKey.action,
          activateAccessKeys: activateAccessKeys.action,
          deactivateAccessKeys: deactivateAccessKeys.action,
          deleteAccessKeys: deleteAccessKeys.action,
          getTenantRoles: getTenantRoles.action,
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
