// eslint-disable-next-line max-classes-per-file
import {
  createSingletonMixin,
  compose,
  createTemplate,
} from '@descope/sdk-helpers';
import { initLifecycleMixin } from '../initLifecycleMixin';
import { initElementMixin } from '../initElementMixin';
import { descopeUiMixin } from '../descopeUiMixin';
import { createNotificationEle } from './helpers';
import { NOTIFICATION_ELE_TAG } from './constants';
import { NotificationDriver } from '@descope/sdk-component-drivers';

export const notificationsMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      initLifecycleMixin,
      initElementMixin,
      descopeUiMixin,
    )(superclass);
    return class NotificationsMixinClass extends BaseClass {
      #NotificationDriverWrapper = (() => {
        const loadDescopeUiComponents = this.loadDescopeUiComponents.bind(this);
        return class NotificationDriverWrapper extends NotificationDriver {
          setContent(templateOrString: HTMLTemplateElement | string) {
            const template =
              typeof templateOrString === 'string'
                ? createTemplate(templateOrString)
                : templateOrString;

            loadDescopeUiComponents(template);
            super.setContent(template);
          }
        };
      })();

      createNotification(
        config?: {
          mode: 'success' | 'error';
          duration: number;
          'has-close-button'?: boolean;
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
          size: 'xs' | 'sm' | 'md' | 'lg';
          bordered?: boolean;
        } & {
          [key: string]: string | boolean | number;
        },
      ) {
        const baseConfig = {};

        const notification = createNotificationEle({
          ...baseConfig,
          ...config,
        });

        this.rootElement.append(notification);

        return new this.#NotificationDriverWrapper(notification, {
          logger: this.logger,
        });
      }

      async init() {
        await super.init?.();
        this.loadDescopeUiComponents([NOTIFICATION_ELE_TAG]);
      }
    };
  },
);
