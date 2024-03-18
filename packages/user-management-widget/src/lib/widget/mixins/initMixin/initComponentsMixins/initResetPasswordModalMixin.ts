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
            // `
            // <descope-container border-radius="sm" data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="1rem">
            //   <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle1">Reset User Password</descope-text>
            //   <descope-text data-id="body-text" full-width="false" id="bodyText" italic="false" mode="primary" text-align="center" variant="body1"></descope-text>
            //   <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="100%" st-gap="0.5rem">
            //       <descope-button data-id="modal-cancel" data-testid="delete-users-modal-cancel" data-type="button" formNoValidate="false" full-width="false" id="deleteUserCancelButton" shape="" size="sm" variant="outline" mode="primary" square="false">Cancel</descope-button>
            //       <descope-button data-id="modal-submit" data-testid="delete-users-modal-submit" data-type="button" formNoValidate="false" full-width="false" id="deleteUserSubmitButton" shape="" size="sm" variant="contained" mode="primary" square="false">Reset</descope-button>
            //   </descope-container>
            // </descope-container>
            // `,
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
          description.text = `Reset password for ${userDetails}?`;
        };
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        await this.#initResetPasswordModal();
      }
    },
);
