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
          getTenantPermissions(this.state)?.map(({ name }) => ({
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
            // await import('../../../../../../test/mocks/editRoleModalMock').then(module => module.default)
            await this.fetchWidgetPage('edit-role-modal.html'),
          ),
        );

        this.#initCancelButton();
        this.#initSubmitButton();

        this.#permissionsMultiSelect = new MultiSelectDriver(
          () =>
            this.editRoleModal.ele?.querySelector(
              '[data-id="permissions-multiselect"]',
            ),
          { logger: this.logger },
        );

        this.editRoleModal.beforeOpen = async () => {
          await this.#updatePermissionsMultiSelect();
          this.#updateModalData();
        };
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        await this.#initEditRoleModal();
      }
    },
);
