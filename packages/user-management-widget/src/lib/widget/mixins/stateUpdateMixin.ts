import { compose } from '../../helpers/compose';
import { withMemCache } from '../../helpers/generic';
import { createSingletonMixin } from '../../helpers/mixins';
import { initMixin } from './initMixin';
import { getFilteredUsers, getIsUsersSelected, getNotifications } from '../state/selectors';
import { stateMixin } from './stateManagementMixin';
import { State } from '../state/types';
import { notificationsMixin } from '../../mixins/notificationsMixin';

export const stateUpdateMixin = createSingletonMixin((superclass: CustomElementConstructor) =>
  class StateUpdateMixinClass extends compose(
    initMixin,
    stateMixin,
    notificationsMixin
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
        notifications.forEach(({ type, msg }) => {
          const notification = this.createNotification({
            mode: type,
            duration: 3000,
            'has-close-button': true,
            position: 'bottom-start',
            size: 'sm',
            icon: type
          });
          notification.setContent(msg);
          notification.show();
        });

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


