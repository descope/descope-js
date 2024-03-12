import { compose } from '../../../../helpers/compose';
import { createTemplate } from '../../../../helpers/dom';
import { createSingletonMixin } from '../../../../helpers/mixins';
import { formMixin } from '../../../../mixins/formMixin';
import { loggerMixin } from '../../../../mixins/loggerMixin';
import { modalMixin } from '../../../../mixins/modalMixin';
import { ButtonDriver } from '../../../drivers/ButtonDriver';
import { ModalDriver } from '../../../drivers/ModalDriver';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import {
  getSelectedUserLoginId,
  getSelectedUsersDetailsForDisplay,
} from '../../../state/selectors';
import { TextDriver } from '../../../drivers/TextDriver';

export const initRemovePasskeyModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitRemovePasskeyModalMixinClass extends compose(
      stateManagementMixin,
      modalMixin,
      loggerMixin,
      formMixin,
      initWidgetRootMixin,
    )(superclass) {
      removePasskeyModal: ModalDriver;

      #initCancelButton() {
        const cancelButton = new ButtonDriver(
          () =>
            this.removePasskeyModal.ele?.querySelector(
              '[data-id="modal-cancel"]',
            ),
          { logger: this.logger },
        );
        cancelButton.onClick(() => this.removePasskeyModal.close());
      }

      #initSubmitButton() {
        const submitButton = new ButtonDriver(
          () =>
            this.removePasskeyModal.ele?.querySelector(
              '[data-id="modal-submit"]',
            ),
          { logger: this.logger },
        );

        submitButton.onClick(() => {
          const selectedUsersLoginId = getSelectedUserLoginId(this.state);
          this.actions.removePasskey(selectedUsersLoginId);
          this.removePasskeyModal.close();
        });
      }

      async #initRemovePasskeyModal() {
        this.removePasskeyModal = this.createModal();
        this.removePasskeyModal.setContent(
          createTemplate(
            await this.fetchWidgetPage('remove-passkey-modal.html'),
          ),
        );

        this.#initCancelButton();
        this.#initSubmitButton();

        const description = new TextDriver(
          this.removePasskeyModal.ele?.querySelector('[data-id="body-text"]'),
          { logger: this.logger },
        );

        this.removePasskeyModal.beforeOpen = async () => {
          const userDetails = getSelectedUsersDetailsForDisplay(this.state);
          description.text = `Remove passkey for ${userDetails}?`;
        };
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        await this.#initRemovePasskeyModal();
      }
    },
);
