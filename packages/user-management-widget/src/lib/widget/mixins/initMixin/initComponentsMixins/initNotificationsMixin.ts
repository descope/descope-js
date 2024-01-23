import { compose } from '../../../../helpers/compose';
import { withMemCache } from '../../../../helpers/generic';
import { createSingletonMixin } from '../../../../helpers/mixins';
import { loggerMixin } from '../../../../mixins/loggerMixin';
import { notificationsMixin } from '../../../../mixins/notificationsMixin';
import { getNotifications } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import checkmark from '../../../../assets/checkmark.svg';
import warning from '../../../../assets/warning.svg';
import close from '../../../../assets/close.svg';
import { initLifecycleMixin } from '../../../../mixins/initLifecycleMixin';

type Notifications = ReturnType<typeof getNotifications>
type Notification = Notifications[0]

export const initNotificationsMixin = createSingletonMixin(<T extends CustomElementConstructor>(superclass: T) =>
  class InitNotificationsMixinClass extends compose(loggerMixin, stateManagementMixin, notificationsMixin, initLifecycleMixin)(superclass) {

    // eslint-disable-next-line class-methods-use-this
    #createNotificationContent({ type, msg }: Notification) {
      // eslint-disable-next-line no-nested-ternary
      const icon = type === 'success' ? checkmark() :
        type === 'error' ? warning()
          : null;

      const closeIcon = Object.assign(close(), { slot: 'close' });

      return `
      ${icon?.outerHTML}${msg}
      ${closeIcon.outerHTML}
      `;
    }

    #createNotification(type: Notification['type']) {
      return this.createNotification({
        mode: type,
        duration: 3000,
        position: 'bottom-start',
        size: 'sm',
      });
    }

    #onNotificationsUpdate = withMemCache((notifications: Notifications) => {
      if (notifications.length) {
        notifications.forEach(({ type, msg }) => {
          const notification = this.#createNotification(type);

          notification.setContent(this.#createNotificationContent({ type, msg }));

          notification.show();
        });

        // when there is a selection update from the table we get a double notification
        // this is why we are wrapping the clearNotifications action with timeout;
        setTimeout(() => this.actions.clearNotifications());
      }
    });

    async init() {
      await super.init?.();

      this.subscribe(this.#onNotificationsUpdate.bind(this), getNotifications);
    }
  });
