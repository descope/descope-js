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
import { loggerMixin, modalMixin } from '@descope/sdk-mixins';
import {
  getSelectedAccessKeys,
  getSelectedAccessKeysDetailsForDisplay,
} from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initDeactivateAccessKeysModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitDeactivateAccessKeysModalMixinClass extends compose(
      stateManagementMixin,
      modalMixin,
      loggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      deactivateAccessKeysModal: ModalDriver;

      async #initDeactivateAccessKeyModal() {
        this.deactivateAccessKeysModal = this.createModal();
        this.deactivateAccessKeysModal.setContent(
          createTemplate(
            // `
            // <descope-container border-radius="sm" data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="1rem">
            //   <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle1">Deactivate Access Keys</descope-text>
            //   <descope-text data-id="body-text" full-width="false" id="bodyText" italic="false" mode="primary" text-align="center" variant="body1"></descope-text>
            //   <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="100%" st-gap="0.5rem">
            //     <descope-button data-id="modal-cancel" data-testid="deactivate-access-keys-modal-cancel" data-type="button" formNoValidate="false" full-width="false" id="deactivateAccessKeyCancelButton" shape="" size="sm" variant="outline" mode="primary" square="false">Cancel</descope-button>
            //     <descope-button data-id="modal-submit" data-testid="deactivate-access-keys-modal-submit" data-type="button" formNoValidate="false" full-width="false" id="deactivateAccessKeySubmitButton" shape="" size="sm" variant="contained" mode="primary" square="false">Deactivate</descope-button>
            //   </descope-container>
            // </descope-container>
            //   `,
            await this.fetchWidgetPage('deactivate-access-keys-modal.html'),
          ),
        );

        const cancelButton = new ButtonDriver(
          () =>
            this.deactivateAccessKeysModal.ele?.querySelector(
              '[data-id="modal-cancel"]',
            ),
          { logger: this.logger },
        );
        cancelButton.onClick(() => this.deactivateAccessKeysModal.close());

        const submitButton = new ButtonDriver(
          () =>
            this.deactivateAccessKeysModal.ele?.querySelector(
              '[data-id="modal-submit"]',
            ),
          { logger: this.logger },
        );
        submitButton.onClick(() => {
          const selectedAccessKeys = getSelectedAccessKeys(this.state);
          this.actions.deactivateAccessKeys(
            selectedAccessKeys?.map((accessKey) => accessKey.id),
          );
          this.deactivateAccessKeysModal.close();
        });

        const description = new TextDriver(
          this.deactivateAccessKeysModal.ele?.querySelector(
            '[data-id="body-text"]',
          ),
          { logger: this.logger },
        );

        this.deactivateAccessKeysModal.beforeOpen = () => {
          const accessKeyDetails = getSelectedAccessKeysDetailsForDisplay(
            this.state,
          );
          description.text = `Deactivate ${accessKeyDetails}?`;
        };
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        await this.#initDeactivateAccessKeyModal();
      }
    },
);
