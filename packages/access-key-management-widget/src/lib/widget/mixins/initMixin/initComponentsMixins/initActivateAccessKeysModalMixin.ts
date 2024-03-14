import { compose } from '../../../../helpers/compose';
import { createTemplate } from '../../../../helpers/dom';
import { createSingletonMixin } from '../../../../helpers/mixins';
import { loggerMixin } from '../../../../mixins/loggerMixin';
import { modalMixin } from '../../../../mixins/modalMixin';
import { ButtonDriver } from '../../../drivers/ButtonDriver';
import { ModalDriver } from '../../../drivers/ModalDriver';
import { TextDriver } from '../../../drivers/TextDriver';
import {
  getSelectedAccessKeysDetailsForDisplay,
  getSelectedAccessKeys,
} from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initActivateAccessKeysModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitActivateAccessKeysModalMixinClass extends compose(
      stateManagementMixin,
      modalMixin,
      loggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      activateAccessKeysModal: ModalDriver;

      async #initActivateAccessKeyModal() {
        this.activateAccessKeysModal = this.createModal();
        this.activateAccessKeysModal.setContent(
          createTemplate(
            `
            <descope-container border-radius="sm" data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="1rem">
              <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle1">Activate Access Keys</descope-text>
              <descope-text data-id="body-text" full-width="false" id="bodyText" italic="false" mode="primary" text-align="center" variant="body1"></descope-text>
              <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="100%" st-gap="0.5rem">
                <descope-button data-id="modal-cancel" data-testid="activate-access-keys-modal-cancel" data-type="button" formNoValidate="false" full-width="false" id="activateAccessKeyCancelButton" shape="" size="sm" variant="outline" mode="primary" square="false">Cancel</descope-button>
                <descope-button data-id="modal-submit" data-testid="activate-access-keys-modal-submit" data-type="button" formNoValidate="false" full-width="false" id="activateAccessKeySubmitButton" shape="" size="sm" variant="contained" mode="primary" square="false">Activate</descope-button>
              </descope-container>
            </descope-container>
              `,
            // await this.fetchWidgetPage('activate-access-keys-modal.html'),
          ),
        );

        const cancelButton = new ButtonDriver(
          () =>
            this.activateAccessKeysModal.ele?.querySelector(
              '[data-id="modal-cancel"]',
            ),
          { logger: this.logger },
        );
        cancelButton.onClick(() => this.activateAccessKeysModal.close());

        const submitButton = new ButtonDriver(
          () =>
            this.activateAccessKeysModal.ele?.querySelector(
              '[data-id="modal-submit"]',
            ),
          { logger: this.logger },
        );
        submitButton.onClick(() => {
          const selectedAccessKeys = getSelectedAccessKeys(this.state);
          this.actions.activateAccessKeys(
            selectedAccessKeys?.map((accessKey) => accessKey.id),
          );
          this.activateAccessKeysModal.close();
        });

        const description = new TextDriver(
          this.activateAccessKeysModal.ele?.querySelector(
            '[data-id="body-text"]',
          ),
          { logger: this.logger },
        );

        this.activateAccessKeysModal.beforeOpen = () => {
          const accessKeyDetails = getSelectedAccessKeysDetailsForDisplay(
            this.state,
          );
          description.text = `Activate ${accessKeyDetails}?`;
        };
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        await this.#initActivateAccessKeyModal();
      }
    },
);
