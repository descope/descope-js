import { ButtonDriver, ModalDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  createTemplate,
} from '@descope/sdk-helpers';
import { formMixin, loggerMixin, modalMixin } from '@descope/sdk-mixins';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initCreatedAccessKeyModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitCreatedAccessKeyModalMixinClass extends compose(
      stateManagementMixin,
      modalMixin,
      formMixin,
      loggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      createdAccessKeyModal: ModalDriver;

      async #initCreatedAccessKeyModal() {
        this.createdAccessKeyModal = this.createModal();
        this.createdAccessKeyModal.setContent(
          createTemplate(
            // await import('../../../../../../test/mocks/createdAccessKeyModalMock').then(module => module.default)
            await this.fetchWidgetPage('created-access-key-modal.html'),
          ),
        );

        const closeButton = new ButtonDriver(
          () =>
            this.createdAccessKeyModal.ele?.querySelector(
              '[data-id="modal-close"]',
            ),
          { logger: this.logger },
        );
        closeButton.onClick(() => {
          navigator.clipboard.writeText(
            this.getFormData(this.createdAccessKeyModal.ele)['generated-key'],
          );
          this.resetFormData(this.createdAccessKeyModal.ele);
          this.createdAccessKeyModal.close();
        });
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initCreatedAccessKeyModal();
      }
    },
);
