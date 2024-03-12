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

export const initDisableUserModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitDisableUserModalMixinClass extends compose(
      stateManagementMixin,
      modalMixin,
      loggerMixin,
      formMixin,
      initWidgetRootMixin,
    )(superclass) {
      disableUserModal: ModalDriver;

      #initCancelButton() {
        const cancelButton = new ButtonDriver(
          () =>
            this.disableUserModal.ele?.querySelector(
              '[data-id="modal-cancel"]',
            ),
          { logger: this.logger },
        );
        cancelButton.onClick(() => this.disableUserModal.close());
      }

      #initSubmitButton() {
        const submitButton = new ButtonDriver(
          () =>
            this.disableUserModal.ele?.querySelector(
              '[data-id="modal-submit"]',
            ),
          { logger: this.logger },
        );

        submitButton.onClick(() => {
          const selectedUsersLoginId = getSelectedUserLoginId(this.state);
          this.actions.disableUser(selectedUsersLoginId);
          this.disableUserModal.close();
        });
      }

      async #initDisableUserModal() {
        this.disableUserModal = this.createModal();
        this.disableUserModal.setContent(
          createTemplate(await this.fetchWidgetPage('disable-user-modal.html')),
        );

        this.#initCancelButton();
        this.#initSubmitButton();

        const description = new TextDriver(
          this.disableUserModal.ele?.querySelector('[data-id="body-text"]'),
          { logger: this.logger },
        );

        this.disableUserModal.beforeOpen = async () => {
          const userDetails = getSelectedUsersDetailsForDisplay(this.state);
          description.text = `Disable ${userDetails}?`;
        };
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        await this.#initDisableUserModal();
      }
    },
);
