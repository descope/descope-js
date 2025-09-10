import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import {
  initLifecycleMixin,
  loggerMixin,
  notificationsMixin,
} from '@descope/sdk-mixins';
import checkmark from '../../../../assets/checkmark.svg';
import close from '../../../../assets/close.svg';
import warning from '../../../../assets/warning.svg';
import { getNotifications } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';

type Notifications = ReturnType<typeof getNotifications>;
type Notification = Notifications[0];

const SUCCESS_NOTIFICATION_DURATION = 3000;
const ERROR_NOTIFICATION_DURATION = 0;

const notificationTypesIcons = {
  success: checkmark(),
  error: warning(),
};

export const initNotificationsMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitNotificationsMixinClass extends compose(
      loggerMixin,
      stateManagementMixin,
      notificationsMixin,
      initLifecycleMixin,
    )(superclass) {
      // eslint-disable-next-line class-methods-use-this
      #createNotificationContent({ type, msg }: Notification) {
        const icon = notificationTypesIcons[type];

        const closeIcon = Object.assign(close(), { slot: 'close' });

        return `${icon?.outerHTML || ''}${msg}${closeIcon.outerHTML}`;
      }

      #createNotification(type: Notification['type']) {
        return this.createNotification({
          mode: type,
          duration:
            type === 'error'
              ? ERROR_NOTIFICATION_DURATION
              : SUCCESS_NOTIFICATION_DURATION,
          position: 'bottom-start',
          size: 'sm',
        });
      }

      #onNotificationsUpdate = withMemCache((notifications: Notifications) => {
        if (notifications.length) {
          notifications.forEach(({ type, msg }) => {
            const notification = this.#createNotification(type);

            notification.setContent(
              this.#createNotificationContent({ type, msg }),
            );

            notification.show();
          });

          // when there is a selection update from the table we get a double notification
          // this is why we are wrapping the clearNotifications action with timeout;
          setTimeout(() => this.actions.clearNotifications());
        }
      });

      async init() {
        await super.init?.();

        this.subscribe(
          this.#onNotificationsUpdate.bind(this),
          getNotifications,
        );
      }
    },
);
