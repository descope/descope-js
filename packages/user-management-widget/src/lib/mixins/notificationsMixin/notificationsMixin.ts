// eslint-disable-next-line max-classes-per-file
import { createSingletonMixin } from '../../helpers/mixins';
import { initLifecycleMixin } from '../initLifecycleMixin';
import { compose } from '../../helpers/compose';
import { initElementMixin } from '../initElementMixin';
import { descopeUiMixin } from '../descopeUiMixin/descopeUiMixin';
import { createNotificationEle } from './helpers';
import { NOTIFICATION_ELE_TAG } from './constants';
import { createTemplate } from '../../helpers/dom';
import { NotificationDriver } from '../../widget/drivers/NotificationDriver';

export const notificationsMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(initLifecycleMixin, initElementMixin, descopeUiMixin)(superclass);
    return class NotificationsMixinClass extends BaseClass {

      #NotificationDriverWrapper = (() => {
        const loadDescopeUiComponents = this.loadDescopeUiComponents.bind(this);
        return class NotificationDriverWrapper extends NotificationDriver {
          setContent(templateOrString: HTMLTemplateElement | string) {

            const template = typeof templateOrString === 'string' ?
              createTemplate(templateOrString) :
              templateOrString;

            loadDescopeUiComponents(template);
            super.setContent(template);
          }
        };
      })();

      createNotification(config?: {
        mode: 'success' | 'error',
        duration: number,
        'has-close-button'?: boolean,
        position?: 'top-stretch' |
        'top-start' |
        'top-center' |
        'top-end' |
        'middle' |
        'bottom-start' |
        'bottom-center' |
        'bottom-end' |
        'bottom-stretch'
        size: 'xs' | 'sm' | 'md' | 'lg',
        icon?: 'success' | 'error',
      } & {
        [key: string]: string | boolean | number
      }) {
        const baseConfig = {};

        const notification = createNotificationEle({
          ...baseConfig,
          ...config
        });

        this.rootElement.append(notification);

        return new this.#NotificationDriverWrapper(notification, { logger: this.logger });
      }

      async init() {
        await super.init?.();
        this.loadDescopeUiComponents([NOTIFICATION_ELE_TAG]);
      }
    };
  }
);
