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
            `
            <descope-container data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="1rem">
              <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle1">Password was generated</descope-text>
              <descope-text full-width="false" id="subtitleText" italic="false" mode="primary" text-align="center" variant="body1">Make sure to copy it now, since it won't be available again in the future.</descope-text>
              <descope-text full-width="false" id="bodyText" italic="false" mode="primary" text-align="center" variant="body1">New temporary password is:</descope-text>
              <descope-text-field bordered="true" full-width="true" id="generated-password" label="Generated password" max="100" name="generated-password" placeholder="Generated Password" required="true" size="sm" readonly></descope-text-field>
              <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="100%" st-gap="0.5rem">
                <descope-button data-id="modal-close" data-testid="generated-password-modal-close" data-type="button" formNoValidate="false" full-width="false" id="generatedPasswrodCancelButton" shape="" size="sm" variant="outline" mode="primary" square="false">Copy to clipboard & close</descope-button>
              </descope-container>
            </descope-container>
            `,
            // await this.fetchWidgetPage('generated-password-modal.html'),
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
