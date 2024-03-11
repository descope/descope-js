import { compose } from '../../../../helpers/compose';
import { createTemplate } from '../../../../helpers/dom';
import { createSingletonMixin } from '../../../../helpers/mixins';
import { formMixin } from '../../../../mixins/formMixin';
import { loggerMixin } from '../../../../mixins/loggerMixin';
import { modalMixin } from '../../../../mixins/modalMixin';
import { ButtonDriver } from '../../../drivers/ButtonDriver';
import { ModalDriver } from '../../../drivers/ModalDriver';
import { MultiSelectDriver } from '../../../drivers/MultiSelectDriver';
import { TextFieldDriver } from '../../../drivers/TextFieldDriver';
import {
  getSelectedRoles,
  getTenantPermissions,
} from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initEditRoleModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitEditRoleModalMixinClass extends compose(
      stateManagementMixin,
      modalMixin,
      loggerMixin,
      formMixin,
      initWidgetRootMixin,
    )(superclass) {
      editRoleModal: ModalDriver;

      #idInput: TextFieldDriver;

      #permissionsMultiSelect: MultiSelectDriver;

      #initCancelButton() {
        const cancelButton = new ButtonDriver(
          () =>
            this.editRoleModal.ele?.querySelector('[data-id="modal-cancel"]'),
          { logger: this.logger },
        );
        cancelButton.onClick(() => this.editRoleModal.close());
      }

      #initSubmitButton() {
        const submitButton = new ButtonDriver(
          () =>
            this.editRoleModal.ele?.querySelector('[data-id="modal-submit"]'),
          { logger: this.logger },
        );

        submitButton.onClick(() => {
          if (this.validateForm(this.editRoleModal.ele)) {
            const { name, ...formData } = this.getFormData(
              this.editRoleModal.ele,
            );
            const roleDetails = getSelectedRoles(this.state)?.[0];
            this.actions.updateRole({
              newName: name,
              name: roleDetails.name,
              ...formData,
            });
            this.editRoleModal.close();
            this.resetFormData(this.editRoleModal.ele);
          }
        });
      }

      #updatePermissionsMultiSelect = async () => {
        await this.#permissionsMultiSelect.setData(
          getTenantPermissions(this.state).map(({ name }) => ({
            value: name,
            label: name,
          })),
        );
      };

      #updateModalData = () => {
        const roleDetails = getSelectedRoles(this.state)?.[0];

        const formData = {
          name: roleDetails?.name,
          description: roleDetails?.description,
          permissionNames: roleDetails?.permissionNames,
        };

        this.setFormData(this.editRoleModal.ele, formData);
      };

      async #initEditRoleModal() {
        this.editRoleModal = this.createModal();
        this.editRoleModal.setContent(
          createTemplate(
            // `
            // <descope-container data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="1rem">
            //   <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle1">Edit Role</descope-text>
            //   <descope-text-field bordered="true" full-width="true" id="name" label="Name" max="100" name="name" placeholder="Name" required="true" size="sm"></descope-text-field>
            //   <descope-text-field bordered="true" full-width="true" id="description" label="Description" max="1024" name="description" placeholder="Description" required="false" size="sm"></descope-text-field>
            //   <descope-multi-select-combo-box bordered="true" data-id="permissions-multiselect" full-width="true" id="permissionsInput" item-label-path="data-name" item-value-path="data-id" label="Permissions" name="permissionNames" size="sm" allow-custom-value="false" clear-button-visible="true"></descope-multi-select-combo-box>
            //   <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="100%" st-gap="0.5rem">
            //     <descope-button data-id="modal-cancel" data-testid="edit-role-modal-cancel" data-type="button" formNoValidate="false" full-width="false" id="editRoleCancelButton" shape="" size="sm" variant="outline" mode="primary" square="false">Cancel</descope-button>
            //     <descope-button data-id="modal-submit" data-testid="edit-role-modal-submit" data-type="button" formNoValidate="false" full-width="false" id="editRoleSubmitButton" shape="" size="sm" variant="contained" mode="primary" square="false">Edit Role</descope-button>
            //   </descope-container>
            // </descope-container>
            // `
            await this.fetchWidgetPage('edit-role-modal.html'),
          ),
        );

        this.#initCancelButton();
        this.#initSubmitButton();

        this.#idInput = new TextFieldDriver(
          this.editRoleModal.ele?.querySelector('[name="loginId"]'),
          { logger: this.logger },
        );

        this.#permissionsMultiSelect = new MultiSelectDriver(
          () =>
            this.editRoleModal.ele?.querySelector(
              '[data-id="permissions-multiselect"]',
            ),
          { logger: this.logger },
        );

        this.editRoleModal.beforeOpen = async () => {
          await this.#updatePermissionsMultiSelect();
          this.#idInput.disable();
          this.#updateModalData();
        };
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        await this.#initEditRoleModal();
      }
    },
);
