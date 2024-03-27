/* eslint-disable no-param-reassign */
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  createStateManagementMixin,
  initLifecycleMixin,
  loggerMixin,
} from '@descope/sdk-mixins';
import {
  createUser,
  deleteUsers,
  disableUser,
  enableUser,
  setTempUserPassword,
  getCustomAttributes,
  getTenantRoles,
  removePasskey,
  searchUser,
  updateUser,
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
          setTempUserPassword.reducer(builder);
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
          removePasskey: removePasskey.action,
          getCustomAttributes: getCustomAttributes.action,
          getTenantRoles: getTenantRoles.action,
          setTempUserPassword: setTempUserPassword.action,
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
