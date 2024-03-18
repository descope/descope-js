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
            // `
            // <descope-container border-radius="sm" data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="1rem">
            //   <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle1">Delete Roles</descope-text>
            //   <descope-text data-id="body-text" full-width="false" id="bodyText" italic="false" mode="primary" text-align="center" variant="body1"></descope-text>
            //   <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="100%" st-gap="0.5rem">
            //     <descope-button data-id="modal-cancel" data-testid="delete-roles-modal-cancel" data-type="button" formNoValidate="false" full-width="false" id="deleteRoleCancelButton" shape="" size="sm" variant="outline" mode="primary" square="false">Cancel</descope-button>
            //     <descope-button data-id="modal-submit" data-testid="delete-roles-modal-submit" data-type="button" formNoValidate="false" full-width="false" id="deleteRoleSubmitButton" shape="" size="sm" variant="contained" mode="primary" square="false">Delete</descope-button>
            //   </descope-container>
            // </descope-container>
            //   `,
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
