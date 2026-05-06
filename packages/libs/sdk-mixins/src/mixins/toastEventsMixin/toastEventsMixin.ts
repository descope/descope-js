import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { initLifecycleMixin } from '../initLifecycleMixin';
import { loggerMixin } from '../loggerMixin';
import { notificationsMixin } from '../notificationsMixin';

export type ToastNotification = {
  type: 'success' | 'error';
  msg: string;
  detail?: string;
};

export type ToastEventDetail = {
  message: string;
  detail?: string;
  severity: ToastNotification['type'];
};

const SUCCESS_NOTIFICATION_DURATION = 3000;
const ERROR_NOTIFICATION_DURATION = 0;

export type ToastEventsMixinConfig<S = any> = {
  selector: (state: S) => ToastNotification[];
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
  icons?: {
    success?: () => HTMLElement;
    error?: () => HTMLElement;
    close?: () => HTMLElement;
  };
  eventName?: string;
};

export const createToastEventsMixin = <S>(
  config: ToastEventsMixinConfig<S>,
) => {
  const {
    selector,
    successDuration = SUCCESS_NOTIFICATION_DURATION,
    errorDuration = ERROR_NOTIFICATION_DURATION,
    position = 'bottom-start',
    size = 'sm',
    icons = {},
    eventName = 'toast',
  } = config;

  return createSingletonMixin(
    <T extends CustomElementConstructor>(superclass: T) =>
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
          const iconFactory =
            icons[type as keyof Pick<typeof icons, 'success' | 'error'>];
          const icon = iconFactory?.();
          const closeIconEl = icons.close
            ? Object.assign(icons.close(), { slot: 'close' })
            : null;
          const body = detail ? `<div><div>${msg}</div>${detail}</div>` : msg;
          return `${icon?.outerHTML || ''}${body}${
            closeIconEl?.outerHTML || ''
          }`;
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
              notifications.forEach(({ type, msg, detail }) => {
                const toastEvent = new CustomEvent(eventName, {
                  cancelable: true,
                  detail: { message: msg, detail, severity: type },
                });
                this.dispatchEvent(toastEvent);
                if (toastEvent.defaultPrevented) return;

                const notification = this.#createNotification(type);
                notification.setContent(
                  this.#createNotificationContent({ type, msg, detail }),
                );
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
