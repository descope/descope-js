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
            // await import('../../../../../../test/mocks/activateAccessKeyModalMock').then(module => module.default)
            await this.fetchWidgetPage('activate-access-keys-modal.html'),
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
