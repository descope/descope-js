import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { initLifecycleMixin } from '../initLifecycleMixin';
import { loggerMixin } from '../loggerMixin';
import { notificationsMixin } from '../notificationsMixin';
import { defaultIcons } from './icons';
import { ToastNotification } from './types';

const DEFAULT_SUCCESS_NOTIFICATION_DURATION = 3000;
const DEFAULT_ERROR_NOTIFICATION_DURATION = 0;

export type ToastNotificationsMixinConfig = {
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

/**
 * Self-contained toast notifications mixin.
 *
 * Composes everything it needs (logger, descope-ui notifications, init
 * lifecycle) and exposes a single public method: `notify()`. Call it with a
 * toast (or a list) and it shows them right away.
 *
 * It does NOT depend on any state mixin. Emitting a toast is an explicit call,
 * so there is no hidden "you must also compose the state mixin" requirement.
 */
export const createToastNotificationsMixin = (
  config: ToastNotificationsMixinConfig = {},
) => {
  const {
    successDuration = DEFAULT_SUCCESS_NOTIFICATION_DURATION,
    errorDuration = DEFAULT_ERROR_NOTIFICATION_DURATION,
    position = 'bottom-start',
    size = 'sm',
    eventName = 'toast',
  } = config;

  return createSingletonMixin(
    <T extends CustomElementConstructor>(superclass: T) =>
      class ToastNotificationsMixinClass extends compose(
        loggerMixin,
        notificationsMixin,
        initLifecycleMixin,
      )(superclass) {
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

        #show(toast: ToastNotification) {
          const toastEvent = new CustomEvent(eventName, {
            cancelable: true,
            detail: {
              message: toast.msg,
              detail: toast.detail,
              severity: toast.type,
            },
          });
          this.dispatchEvent(toastEvent);

          // consumers can handle the event and call preventDefault to render
          // their own toast instead of the built-in one
          if (toastEvent.defaultPrevented) return;

          const notification = this.#createNotification(toast.type);
          notification.setContent(this.#createNotificationContent(toast));
          notification.show();
        }

        notify(toast: ToastNotification | ToastNotification[]) {
          const toasts = Array.isArray(toast) ? toast : [toast];
          toasts.forEach((t) => this.#show(t));
        }

        async init() {
          await super.init?.();
        }
      },
  );
};
