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
            // await import('../../../../../../test/mocks/deactivateAccessKeyModalMock').then(module => module.default)
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
