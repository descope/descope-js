// eslint-disable-next-line max-classes-per-file
import { createSingletonMixin, compose } from '@descope/sdk-helpers';
import { initLifecycleMixin } from '../initLifecycleMixin';
import { initElementMixin } from '../initElementMixin';
import { descopeUiMixin } from '../descopeUiMixin';
import { createModalEle } from './helpers';
import { MODAL_ELE_TAG } from './constants';
import { ModalDriver } from '@descope/sdk-component-drivers';

export const modalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    const BaseClass = compose(
      initLifecycleMixin,
      initElementMixin,
      descopeUiMixin,
    )(superclass);
    return class ModalMixinClass extends BaseClass {
      #ModalDriverWrapper = (() => {
        const loadDescopeUiComponents = this.loadDescopeUiComponents.bind(this);
        return class ModalDriverWrapper extends ModalDriver {
          setContent(template: HTMLTemplateElement) {
            loadDescopeUiComponents(template);
            super.setContent(template);
          }
        };
      })();

      // the driver class createModal instantiates - subclass it to build a
      // modal driver with extra behavior (see flowModalMixin) and hand the
      // result to createModal
      get modalDriverClass() {
        return this.#ModalDriverWrapper;
      }

      createModal(
        config?: Record<string, string>,
        DriverClass: typeof ModalDriver = this.#ModalDriverWrapper,
      ) {
        const baseConfig = {};

        const modal = createModalEle({
          ...baseConfig,
          ...config,
        });

        this.rootElement.append(modal);

        return new DriverClass(modal, {
          logger: this.logger,
        }) as ModalDriver;
      }

      async init() {
        this.loadDescopeUiComponents([MODAL_ELE_TAG]);
        await super.init?.();
      }
    };
  },
);
