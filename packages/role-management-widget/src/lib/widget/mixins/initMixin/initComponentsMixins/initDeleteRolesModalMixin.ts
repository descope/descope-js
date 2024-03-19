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
  getSelectedRoles,
  getSelectedRolesDetailsForDisplay,
} from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initDeleteRolesModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitDeleteRolesModalMixinClass extends compose(
      stateManagementMixin,
      modalMixin,
      loggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      deleteRolesModal: ModalDriver;

      async #initDeleteRoleModal() {
        this.deleteRolesModal = this.createModal();
        this.deleteRolesModal.setContent(
          createTemplate(
            // await import('../../../../../../test/mocks/deleteRoleModalMock').then(module => module.default)
            await this.fetchWidgetPage('delete-roles-modal.html'),
          ),
        );

        const cancelButton = new ButtonDriver(
          () =>
            this.deleteRolesModal.ele?.querySelector(
              '[data-id="modal-cancel"]',
            ),
          { logger: this.logger },
        );
        cancelButton.onClick(() => this.deleteRolesModal.close());

        const submitButton = new ButtonDriver(
          () =>
            this.deleteRolesModal.ele?.querySelector(
              '[data-id="modal-submit"]',
            ),
          { logger: this.logger },
        );
        submitButton.onClick(() => {
          const selectedRoles = getSelectedRoles(this.state);
          this.actions.deleteRoles(selectedRoles?.map((role) => role.name));
          this.deleteRolesModal.close();
        });

        const description = new TextDriver(
          this.deleteRolesModal.ele?.querySelector('[data-id="body-text"]'),
          { logger: this.logger },
        );

        this.deleteRolesModal.beforeOpen = () => {
          const roleDetails = getSelectedRolesDetailsForDisplay(this.state);
          description.text = `Delete ${roleDetails}?`;
        };
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        await this.#initDeleteRoleModal();
      }
    },
);
