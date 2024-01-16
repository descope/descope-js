import { compose } from '../../helpers/compose';
import { withMemCache } from '../../helpers/generic';
import { createSingletonMixin } from '../../helpers/mixins';
import { initMixin } from './initMixin';
import { getFilteredUsers, getIsUsersSelected, getNotifications } from '../state/selectors';
import { stateMixin } from './stateManagementMixin';
import { State } from '../state/types';

export const stateUpdateMixin = createSingletonMixin((superclass: CustomElementConstructor) =>
  class StateUpdateMixinClass extends compose(
    initMixin,
    stateMixin
  )(superclass) {

    #onStateChange(state: State) {
      this.state = state;

      this.#handleUsersList(getFilteredUsers(state));
      this.#handleIsUserSelected(getIsUsersSelected(state));
      this.#handleNotifications(getNotifications(state));
    }

    #handleIsUserSelected = withMemCache((isSelected: ReturnType<typeof getIsUsersSelected>) => {
      if (isSelected) {
        this.deleteButton.enable();
        this.resetPasswordButton.enable();
      } else {
        this.deleteButton.disable();
        this.resetPasswordButton.disable();
      }
    });

    #handleNotifications = withMemCache((notifications: ReturnType<typeof getNotifications>) => {
      if (notifications.length) {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(notifications, null, 4));
        // when there is a selection update from the table we get a double notification
        // this is why we are wrapping the clearNotifications action with timeout;
        setTimeout(() => this.actions.clearNotifications());
      }
    });

    #handleUsersList = withMemCache((usersList: ReturnType<typeof getFilteredUsers>) => {
      this.usersTable.data = usersList;
    });

    async init() {
      await super.init?.();

      this.subscribe(this.#onStateChange.bind(this));
    }
  });


