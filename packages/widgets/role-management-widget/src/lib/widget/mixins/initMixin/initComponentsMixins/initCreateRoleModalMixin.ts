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
            // await import('../../../../../../test/mocks/createRoleModalMock').then(module => module.default)
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
