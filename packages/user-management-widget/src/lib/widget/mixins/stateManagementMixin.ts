/* eslint-disable no-param-reassign */
import { compose } from '../../helpers/compose';
import { createSingletonMixin } from '../../helpers/mixins';
import { createStateManagementMixin } from '../../mixins/createStateManagementMixin';
import { initLifecycleMixin } from '../../mixins/initLifecycleMixin';
import { loggerMixin } from '../../mixins/loggerMixin';
import { createUser, deleteUsers, expireUserPassword, getCustomAttributes, searchUser } from '../state/asyncActions';
import { initialState } from '../state/initialState';
import { apiMixin } from './apiMixin';

export const stateManagementMixin = createSingletonMixin(<T extends CustomElementConstructor>(superclass: T) => {

  const BaseClass = compose(createStateManagementMixin({
    name: 'widget',
    initialState,
    reducers: {
      setFilter: (state, { payload }) => {
        state.filter = payload?.toLowerCase();
      },
      setSelectedUsersIds: (state, { payload }) => {
        state.selectedUsersLoginIds = payload;
      },
      clearNotifications: (state) => {
        state.notifications = [];
      }
    },
    extraReducers: (builder) => {
      createUser.reducer(builder);
      deleteUsers.reducer(builder);
      searchUser.reducer(builder);
      expireUserPassword.reducer(builder);
      getCustomAttributes.reducer(builder);
    },
    asyncActions: {
      searchUsers: searchUser.action,
      createUser: createUser.action,
      deleteUsers: deleteUsers.action,
      expireUserPassword: expireUserPassword.action,
      getCustomAttributes: getCustomAttributes.action,
    }
  }), initLifecycleMixin, loggerMixin, apiMixin)(superclass);
  return class StateManagementMixinClass extends BaseClass {

    state = initialState;

    constructor(...args: any) {
      super(...args);

      this.subscribe((state) => {
        this.logger.debug(state);
        this.state = state;
      });
    }
  };
});




