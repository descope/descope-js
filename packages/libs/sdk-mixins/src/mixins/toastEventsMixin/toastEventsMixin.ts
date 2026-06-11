import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { initLifecycleMixin } from '../initLifecycleMixin';
import { loggerMixin } from '../loggerMixin';
import { notificationsMixin } from '../notificationsMixin';
import { defaultIcons } from './icons';

const DEFAULT_SUCCESS_NOTIFICATION_DURATION = 3000;
const DEFAULT_ERROR_NOTIFICATION_DURATION = 0;

export type ToastNotification = {
  type: 'success' | 'error';
  msg: string;
  detail?: string;
};

export type ToastEventsMixinConfig<S = any> = {
  selector?: (state: S) => ToastNotification[];
  successDuration?: number;
  errorDuration?: number;
  position?:
    | 'top-stretch'
    | 'top-start'
    | 'top-center'
    | 'top-end'
    | 'middle'
    | 'bottom-start'
    | 'bottom-center'
    | 'bottom-end'
    | 'bottom-stretch';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  eventName?: string;
};

type WithStateMixin = abstract new (...args: any[]) => {
  subscribe: <SelectorR>(
    cb: (state: SelectorR) => void,
    selector?: (state: any) => SelectorR,
  ) => () => void;
  actions: { clearNotifications: () => void };
};

export const createToastEventsMixin = <S>(
  config: ToastEventsMixinConfig<S> = {},
) => {
  const {
    selector = (state: any) => state.notifications,
    successDuration = DEFAULT_SUCCESS_NOTIFICATION_DURATION,
    errorDuration = DEFAULT_ERROR_NOTIFICATION_DURATION,
    position = 'bottom-start',
    size = 'sm',
    eventName = 'toast',
  } = config;

  return createSingletonMixin(
    <T extends CustomElementConstructor & WithStateMixin>(superclass: T) =>
      class ToastEventsMixinClass extends compose(
        loggerMixin,
        notificationsMixin,
        initLifecycleMixin,
      )(superclass) {
        declare subscribe: <SelectorR>(
          cb: (state: SelectorR) => void,
          selector?: (state: any) => SelectorR,
        ) => () => void;

        declare actions: { clearNotifications: () => void };

        // eslint-disable-next-line class-methods-use-this
        #createNotificationContent({ type, msg, detail }: ToastNotification) {
          const typeIcon = defaultIcons[type]();
          const closeIcon = Object.assign(defaultIcons.close(), {
            slot: 'close',
          });

          const template = document.createElement('template');
          template.content.appendChild(typeIcon);

          if (detail) {
            const wrapper = document.createElement('div');
            const msgDiv = document.createElement('div');
            msgDiv.textContent = msg;
            wrapper.appendChild(msgDiv);
            wrapper.appendChild(document.createTextNode(detail));
            template.content.appendChild(wrapper);
          } else {
            template.content.appendChild(document.createTextNode(msg));
          }

          template.content.appendChild(closeIcon);
          return template;
        }

        #createNotification(type: ToastNotification['type']) {
          return this.createNotification({
            mode: type,
            duration: type === 'error' ? errorDuration : successDuration,
            position,
            size,
          });
        }

        #onNotificationsUpdate = withMemCache(
          (notifications: ToastNotification[]) => {
            if (notifications.length) {
              notifications.forEach((toast) => {
                const toastEvent = new CustomEvent(eventName, {
                  cancelable: true,
                  detail: {
                    message: toast.msg,
                    detail: toast.detail,
                    severity: toast.type,
                  },
                });
                this.dispatchEvent(toastEvent);
                if (toastEvent.defaultPrevented) return;

                const notification = this.#createNotification(toast.type);
                notification.setContent(this.#createNotificationContent(toast));
                notification.show();
              });

              // when there is a selection update from the table we get a double notification
              // this is why we are wrapping the clearNotifications action with timeout;
              setTimeout(() => this.actions.clearNotifications());
            }
          },
        );

        async init() {
          await super.init?.();
          this.subscribe(this.#onNotificationsUpdate.bind(this), selector);
        }
      },
  );
};
