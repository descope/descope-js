import { ButtonDriver, ModalDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  createTemplate,
} from '@descope/sdk-helpers';
import { formMixin, loggerMixin, modalMixin } from '@descope/sdk-mixins';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initGeneratedPasswordModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitGeneratedPasswordModalMixinClass extends compose(
      stateManagementMixin,
      modalMixin,
      loggerMixin,
      formMixin,
      initWidgetRootMixin,
    )(superclass) {
      generatedPasswordModal: ModalDriver;

      async #initGeneratedPasswordModal() {
        this.generatedPasswordModal = this.createModal();
        this.generatedPasswordModal.setContent(
          createTemplate(
            // await import('../../../../../../test/mocks/generatedPasswordModalMock').then(module => module.default)
            await this.fetchWidgetPage('generated-password-modal.html'),
          ),
        );

        const closeButton = new ButtonDriver(
          () =>
            this.generatedPasswordModal.ele?.querySelector(
              '[data-id="modal-close"]',
            ),
          { logger: this.logger },
        );
        closeButton.onClick(() => {
          navigator.clipboard.writeText(
            this.getFormData(this.generatedPasswordModal.ele)[
              'generated-password'
            ],
          );
          this.resetFormData(this.generatedPasswordModal.ele);
          this.generatedPasswordModal.close();
        });
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        await this.#initGeneratedPasswordModal();
      }
    },
);
