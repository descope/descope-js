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
            // `
            // <descope-container data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="1rem">
            //   <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle1">Access key was created</descope-text>
            //   <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="body1">Make sure to copy it now, since it won't be available again in the future.</descope-text>
            //   <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="body1">Your new access key is:</descope-text>
            //   <descope-text-field bordered="true" full-width="true" id="generated-key" label="Generated key" max="100" name="generated-key" placeholder="Generated Key" required="true" size="sm" readonly></descope-text-field>
            //   <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="100%" st-gap="0.5rem">
            //     <descope-button data-id="modal-close" data-testid="created-access-key-modal-close" data-type="button" formNoValidate="false" full-width="false" id="createdAccessKeyCancelButton" shape="" size="sm" variant="outline" mode="primary" square="false">Copy to clipboard & close</descope-button>
            //   </descope-container>
            // </descope-container>
            // `,
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
