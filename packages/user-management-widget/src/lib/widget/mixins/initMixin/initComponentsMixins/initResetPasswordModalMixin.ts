import {
  ButtonDriver,
  ModalDriver,
  TextDriver,
} from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  createTemplate,
} from '@descope/sdk-helpers';
import { formMixin, loggerMixin, modalMixin } from '@descope/sdk-mixins';
import {
  getSelectedUserLoginId,
  getSelectedUsersDetailsForDisplay,
} from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { initGeneratedPasswordModalMixin } from './initGeneratedPasswordModalMixin';

export const initResetPasswordModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitResetPasswordModalMixinClass extends compose(
      stateManagementMixin,
      modalMixin,
      loggerMixin,
      formMixin,
      initWidgetRootMixin,
      initGeneratedPasswordModalMixin,
    )(superclass) {
      resetPasswordModal: ModalDriver;

      #initCancelButton() {
        const cancelButton = new ButtonDriver(
          () =>
            this.resetPasswordModal.ele?.querySelector(
              '[data-id="modal-cancel"]',
            ),
          { logger: this.logger },
        );
        cancelButton.onClick(() => this.resetPasswordModal.close());
      }

      #initSubmitButton() {
        const submitButton = new ButtonDriver(
          () =>
            this.resetPasswordModal.ele?.querySelector(
              '[data-id="modal-submit"]',
            ),
          { logger: this.logger },
        );

        submitButton.onClick(async () => {
          const selectedUsersLoginId = getSelectedUserLoginId(this.state);
          const res: Record<string, any> =
            await this.actions.setTempUserPassword(selectedUsersLoginId);
          this.resetPasswordModal.close();

          this.setFormData(this.generatedPasswordModal.ele, {
            'generated-password': res?.payload?.cleartext,
          });
          this.generatedPasswordModal.open();
        });
      }

      async #initResetPasswordModal() {
        this.resetPasswordModal = this.createModal();
        this.resetPasswordModal.setContent(
          createTemplate(
            // await import('../../../../../../test/mocks/resetPasswordModalMock').then(module => module.default)
            await this.fetchWidgetPage('reset-password-modal.html'),
          ),
        );

        this.#initCancelButton();
        this.#initSubmitButton();

        const description = new TextDriver(
          this.resetPasswordModal.ele?.querySelector('[data-id="body-text"]'),
          { logger: this.logger },
        );

        this.resetPasswordModal.beforeOpen = async () => {
          const userDetails = getSelectedUsersDetailsForDisplay(this.state);
          description.text = `This will generate a new temporary password for ${userDetails}?`;
        };
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        await this.#initResetPasswordModal();
      }
    },
);
