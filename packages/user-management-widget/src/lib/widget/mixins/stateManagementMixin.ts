/* eslint-disable no-param-reassign */
import { compose } from '../../helpers/compose';
import { createSingletonMixin } from '../../helpers/mixins';
import { createStateManagementMixin } from '../../mixins/createStateManagementMixin';
import { initLifecycleMixin } from '../../mixins/initLifecycleMixin';
import { loggerMixin } from '../../mixins/loggerMixin';
import {
  createUser,
  deleteUsers,
  expireUserPassword,
  getCustomAttributes,
  searchUser,
  getTenantRoles,
  updateUser,
  enableUser,
  disableUser,
  removePasskey,
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
          setSelectedUsersIds: (state, { payload }) => {
            state.selectedUsersLoginIds = payload;
          },
          clearNotifications: (state) => {
            state.notifications = [];
          },
        },
        extraReducers: (builder) => {
          createUser.reducer(builder);
          updateUser.reducer(builder);
          enableUser.reducer(builder);
          disableUser.reducer(builder);
          deleteUsers.reducer(builder);
          searchUser.reducer(builder);
          expireUserPassword.reducer(builder);
          removePasskey.reducer(builder);
          getCustomAttributes.reducer(builder);
          getTenantRoles.reducer(builder);
        },
        asyncActions: {
          searchUsers: searchUser.action,
          createUser: createUser.action,
          updateUser: updateUser.action,
          enableUser: enableUser.action,
          disableUser: disableUser.action,
          deleteUsers: deleteUsers.action,
          expireUserPassword: expireUserPassword.action,
          removePasskey: removePasskey.action,
          getCustomAttributes: getCustomAttributes.action,
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
