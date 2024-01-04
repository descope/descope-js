// eslint-disable-next-line max-classes-per-file
import { createSingletonMixin } from '../../helpers/mixins';
import { initLifecycleMixin } from '../initLifecycleMixin';
import { compose } from '../../helpers/compose';
import { initElementMixin } from '../initElementMixin';
import { descopeUiMixin } from '../descopeUiMixin/descopeUiMixin';
import { Modal } from './Modal';
import { createModalEle } from './helpers';
import { MODAL_ELE_TAG } from './constants';

export const modalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class ModalMixinClass extends compose(initLifecycleMixin, initElementMixin, descopeUiMixin)(superclass) {

      #ModalWrapper: any;

      constructor() {
        super();

        const loadDescopeUiComponents = this.loadDescopeUiComponents.bind(this);

        this.#ModalWrapper = class ModalWrapper extends Modal {
          setModalContent(template: DocumentFragment) {
            loadDescopeUiComponents(template);
            super.setModalContent(template);
          }
        };
      }

      #modals: Record<string, Modal> = {};

      createModal(id: string, config?: Record<string, string>) {
        const baseConfig = {};

        const modal = createModalEle({
          ...baseConfig,
          ...config
        });

        this.rootElement.append(modal);

        this.#modals[id] = new this.#ModalWrapper(modal);

        return this.#modals[id];
      }

      removeModal(id: string) {
        this.getModal(id)?.modal.remove();
        delete this.#modals[id];
      }

      getModal(id: string) {
        return this.#modals[id];
      }

      async init() {
        await super.init?.();
        await this.loadDescopeUiComponents([MODAL_ELE_TAG]);
      }
    }
);
