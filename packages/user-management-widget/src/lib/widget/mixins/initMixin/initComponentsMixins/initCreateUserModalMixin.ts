import { compose } from '../../../../helpers/compose';
import { createTemplate } from '../../../../helpers/dom';
import { createSingletonMixin } from '../../../../helpers/mixins';
import { formMixin } from '../../../../mixins/formMixin';
import { loggerMixin } from '../../../../mixins/loggerMixin';
import { modalMixin } from '../../../../mixins/modalMixin';
import { ButtonDriver } from '../../../drivers/ButtonDriver';
import { ModalDriver } from '../../../drivers/ModalDriver';
import { MultiSelectDriver } from '../../../drivers/MultiSelectDriver';
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
          createTemplate(await this.fetchWidgetPage('create-user-modal.html')),
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
