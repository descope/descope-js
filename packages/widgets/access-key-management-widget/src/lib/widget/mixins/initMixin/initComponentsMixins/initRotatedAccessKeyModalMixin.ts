import { ButtonDriver, ModalDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  createTemplate,
} from '@descope/sdk-helpers';
import { formMixin, loggerMixin, modalMixin } from '@descope/sdk-mixins';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initRotatedAccessKeyModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitRotatedAccessKeyModalMixinClass extends compose(
      stateManagementMixin,
      modalMixin,
      formMixin,
      loggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      rotatedAccessKeyModal: ModalDriver;

      async #initRotatedAccessKeyModal() {
        this.rotatedAccessKeyModal = this.createModal();
        this.rotatedAccessKeyModal.setContent(
          createTemplate(
            await this.fetchWidgetPage('rotated-access-key-modal.html'),
          ),
        );

        const closeButton = new ButtonDriver(
          () =>
            this.rotatedAccessKeyModal.ele?.querySelector(
              '[data-id="modal-close"]',
            ),
          { logger: this.logger },
        );
        closeButton.onClick(() => {
          navigator.clipboard.writeText(
            this.getFormData(this.rotatedAccessKeyModal.ele)['generated-key'],
          );
          this.resetFormData(this.rotatedAccessKeyModal.ele);
          this.rotatedAccessKeyModal.close();
        });
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initRotatedAccessKeyModal();
      }
    },
);
