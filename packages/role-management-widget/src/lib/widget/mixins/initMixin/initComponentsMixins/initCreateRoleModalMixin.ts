import {
  ButtonDriver,
  ModalDriver,
  MultiSelectDriver,
} from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  createTemplate,
} from '@descope/sdk-helpers';
import { formMixin, loggerMixin, modalMixin } from '@descope/sdk-mixins';
import { getTenantPermissions } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initCreateRoleModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitCreateRoleModalMixinClass extends compose(
      stateManagementMixin,
      modalMixin,
      formMixin,
      loggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      createRoleModal: ModalDriver;

      #permissionsMultiSelect: MultiSelectDriver;

      async #initCreateRoleModal() {
        this.createRoleModal = this.createModal();
        this.createRoleModal.setContent(
          createTemplate(
            // `
            // <descope-container data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="1rem">
            //   <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle1">New Role</descope-text>
            //   <descope-text-field bordered="true" full-width="true" id="name" label="Name" max="100" name="name" placeholder="Name" required="true" size="sm"></descope-text-field>
            //   <descope-text-field bordered="true" full-width="true" id="description" label="Description" max="1024" name="description" placeholder="Description" required="false" size="sm"></descope-text-field>
            //   <descope-multi-select-combo-box bordered="true" data-id="permissions-multiselect" full-width="true" id="permissionsInput" item-label-path="data-name" item-value-path="data-id" label="Permissions" name="permissionNames" size="sm" allow-custom-value="false" clear-button-visible="true"></descope-multi-select-combo-box>
            //   <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="100%" st-gap="0.5rem">
            //     <descope-button data-id="modal-cancel" data-testid="create-role-modal-cancel" data-type="button" formNoValidate="false" full-width="false" id="createRoleCancelButton" shape="" size="sm" variant="outline" mode="primary" square="false">Cancel</descope-button>
            //     <descope-button data-id="modal-submit" data-testid="create-role-modal-submit" data-type="button" formNoValidate="false" full-width="false" id="createRoleSubmitButton" shape="" size="sm" variant="contained" mode="primary" square="false">Create</descope-button>
            //   </descope-container>
            // </descope-container>
            // `,
            await this.fetchWidgetPage('create-role-modal.html'),
          ),
        );

        const cancelButton = new ButtonDriver(
          () =>
            this.createRoleModal.ele?.querySelector('[data-id="modal-cancel"]'),
          { logger: this.logger },
        );
        cancelButton.onClick(() => {
          this.createRoleModal.close();
          this.resetFormData(this.createRoleModal.ele);
        });

        const submitButton = new ButtonDriver(
          () =>
            this.createRoleModal.ele?.querySelector('[data-id="modal-submit"]'),
          { logger: this.logger },
        );
        submitButton.onClick(async () => {
          if (this.validateForm(this.createRoleModal.ele)) {
            this.actions.createRole({
              ...this.getFormData(this.createRoleModal.ele),
            });
            this.createRoleModal.close();
            this.resetFormData(this.createRoleModal.ele);
          }
        });

        this.#permissionsMultiSelect = new MultiSelectDriver(
          () =>
            this.createRoleModal.ele?.querySelector(
              '[data-id="permissions-multiselect"]',
            ),
          { logger: this.logger },
        );

        this.#updatePermissionsMultiSelect();
      }

      #updatePermissionsMultiSelect = async () => {
        await this.#permissionsMultiSelect.setData(
          getTenantPermissions(this.state)?.map(({ name }) => ({
            value: name,
            label: name,
          })),
        );
      };

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initCreateRoleModal();
      }
    },
);
