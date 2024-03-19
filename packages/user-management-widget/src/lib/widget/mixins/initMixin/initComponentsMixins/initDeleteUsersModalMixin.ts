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
  getSelectedUsersDetailsForDisplay,
  getSelectedUsersUserIds,
} from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initDeleteUsersModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitDeleteUsersModalMixinClass extends compose(
      stateManagementMixin,
      modalMixin,
      loggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      deleteUsersModal: ModalDriver;

      async #initDeleteUserModal() {
        this.deleteUsersModal = this.createModal();
        this.deleteUsersModal.setContent(
          // await import('../../../../../../test/mocks/deleteUserModalMock').then(module => module.default)
          createTemplate(await this.fetchWidgetPage('delete-users-modal.html')),
        );

        const cancelButton = new ButtonDriver(
          () =>
            this.deleteUsersModal.ele?.querySelector(
              '[data-id="modal-cancel"]',
            ),
          { logger: this.logger },
        );
        cancelButton.onClick(() => this.deleteUsersModal.close());

        const submitButton = new ButtonDriver(
          () =>
            this.deleteUsersModal.ele?.querySelector(
              '[data-id="modal-submit"]',
            ),
          { logger: this.logger },
        );
        submitButton.onClick(() => {
          const selectedUsersUserIds = getSelectedUsersUserIds(this.state);
          this.actions.deleteUsers(selectedUsersUserIds);
          this.deleteUsersModal.close();
        });

        const description = new TextDriver(
          this.deleteUsersModal.ele?.querySelector('[data-id="body-text"]'),
          { logger: this.logger },
        );

        this.deleteUsersModal.beforeOpen = () => {
          const userDetails = getSelectedUsersDetailsForDisplay(this.state);
          description.text = `Delete ${userDetails}?`;
        };
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        await this.#initDeleteUserModal();
      }
    },
);
