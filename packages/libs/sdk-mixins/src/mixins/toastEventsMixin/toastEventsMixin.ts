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

const ESC: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

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
    <T extends CustomElementConstructor>(superclass: T) =>
      class ToastEventsMixinClass extends compose(
        loggerMixin,
        notificationsMixin,
        initLifecycleMixin,
      )(superclass) {
        // subscribe and actions are provided at runtime by the widget's stateManagementMixin
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
          const body = detail
            ? `<div><div>${escapeHtml(msg)}</div>${escapeHtml(detail)}</div>`
            : escapeHtml(msg);

          return `${typeIcon.outerHTML}${body}${closeIcon.outerHTML}`;
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
