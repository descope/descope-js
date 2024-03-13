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

export const initEnableUserModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitEnableUserModalMixinClass extends compose(
      stateManagementMixin,
      modalMixin,
      loggerMixin,
      formMixin,
      initWidgetRootMixin,
    )(superclass) {
      enableUserModal: ModalDriver;

      #initCancelButton() {
        const cancelButton = new ButtonDriver(
          () =>
            this.enableUserModal.ele?.querySelector('[data-id="modal-cancel"]'),
          { logger: this.logger },
        );
        cancelButton.onClick(() => this.enableUserModal.close());
      }

      #initSubmitButton() {
        const submitButton = new ButtonDriver(
          () =>
            this.enableUserModal.ele?.querySelector('[data-id="modal-submit"]'),
          { logger: this.logger },
        );

        submitButton.onClick(() => {
          const selectedUsersLoginId = getSelectedUserLoginId(this.state);
          this.actions.enableUser(selectedUsersLoginId);
          this.enableUserModal.close();
        });
      }

      async #initEnableUserModal() {
        this.enableUserModal = this.createModal();
        this.enableUserModal.setContent(
          createTemplate(await this.fetchWidgetPage('enable-user-modal.html')),
        );

        this.#initCancelButton();
        this.#initSubmitButton();

        const description = new TextDriver(
          this.enableUserModal.ele?.querySelector('[data-id="body-text"]'),
          { logger: this.logger },
        );

        this.enableUserModal.beforeOpen = async () => {
          const userDetails = getSelectedUsersDetailsForDisplay(this.state);
          description.text = `Activate ${userDetails}?`;
        };
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        await this.#initEnableUserModal();
      }
    },
);
