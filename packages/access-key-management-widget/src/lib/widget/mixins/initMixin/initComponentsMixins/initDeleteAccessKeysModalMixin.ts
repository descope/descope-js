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

export const initDeleteAccessKeysModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitDeleteAccessKeysModalMixinClass extends compose(
      stateManagementMixin,
      modalMixin,
      loggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      deleteAccessKeysModal: ModalDriver;

      async #initDeleteAccessKeyModal() {
        this.deleteAccessKeysModal = this.createModal();
        this.deleteAccessKeysModal.setContent(
          createTemplate(
            // await import('../../../../../../test/mocks/deleteAccessKeyModalMock').then(module => module.default)
            await this.fetchWidgetPage('delete-access-keys-modal.html'),
          ),
        );

        const cancelButton = new ButtonDriver(
          () =>
            this.deleteAccessKeysModal.ele?.querySelector(
              '[data-id="modal-cancel"]',
            ),
          { logger: this.logger },
        );
        cancelButton.onClick(() => this.deleteAccessKeysModal.close());

        const submitButton = new ButtonDriver(
          () =>
            this.deleteAccessKeysModal.ele?.querySelector(
              '[data-id="modal-submit"]',
            ),
          { logger: this.logger },
        );
        submitButton.onClick(() => {
          const selectedAccessKeys = getSelectedAccessKeys(this.state);
          this.actions.deleteAccessKeys(
            selectedAccessKeys?.map((accessKey) => accessKey.id),
          );
          this.deleteAccessKeysModal.close();
        });

        const description = new TextDriver(
          this.deleteAccessKeysModal.ele?.querySelector(
            '[data-id="body-text"]',
          ),
          { logger: this.logger },
        );

        this.deleteAccessKeysModal.beforeOpen = () => {
          const accessKeyDetails = getSelectedAccessKeysDetailsForDisplay(
            this.state,
          );
          description.text = `Delete ${accessKeyDetails}?`;
        };
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        await this.#initDeleteAccessKeyModal();
      }
    },
);
