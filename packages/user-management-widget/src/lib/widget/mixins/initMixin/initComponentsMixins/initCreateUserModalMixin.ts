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
import { getTenantRoles } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initCreateUserModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitCreateUserModalMixinClass extends compose(
      stateManagementMixin,
      modalMixin,
      formMixin,
      loggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      createUserModal: ModalDriver;

      #rolesMultiSelect: MultiSelectDriver;

      async #initCreateUserModal() {
        this.createUserModal = this.createModal();
        this.createUserModal.setContent(
          createTemplate(
            // await import('../../../../../../test/mocks/createUserModalMock').then(module => module.default)
            await this.fetchWidgetPage('create-user-modal.html'),
          ),
        );

        const cancelButton = new ButtonDriver(
          () =>
            this.createUserModal.ele?.querySelector('[data-id="modal-cancel"]'),
          { logger: this.logger },
        );
        cancelButton.onClick(() => {
          this.createUserModal.close();
          this.resetFormData(this.createUserModal.ele);
        });

        const submitButton = new ButtonDriver(
          () =>
            this.createUserModal.ele?.querySelector('[data-id="modal-submit"]'),
          { logger: this.logger },
        );
        submitButton.onClick(async () => {
          if (this.validateForm(this.createUserModal.ele)) {
            this.actions.createUser({
              ...this.getFormData(this.createUserModal.ele),
              invite: true,
              verifiedEmail: true,
              verifiedPhone: true,
            });
            this.createUserModal.close();
            this.resetFormData(this.createUserModal.ele);
          }
        });

        this.#rolesMultiSelect = new MultiSelectDriver(
          () =>
            this.createUserModal.ele?.querySelector(
              '[data-id="roles-multiselect"]',
            ),
          { logger: this.logger },
        );

        this.#updateRolesMultiSelect();
      }

      #updateRolesMultiSelect = async () => {
        await this.#rolesMultiSelect.setData(
          getTenantRoles(this.state).map(({ name }) => ({
            value: name,
            label: name,
          })),
        );
      };

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initCreateUserModal();
      }
    },
);
