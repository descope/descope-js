/**
 * Owns the role form modal, shared by the Create Role and Duplicate Role flows.
 * The flows differ only in pre-fill (Duplicate) and which thunk submit dispatches
 * (createRole vs duplicateRole). Callers use openRoleModal(mode, prefill?).
 */
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

export type RoleFormData = {
  name: string;
  description?: string;
  permissionNames?: string[];
};

export const initRoleFormModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitRoleFormModalMixinClass extends compose(
      stateManagementMixin,
      modalMixin,
      formMixin,
      loggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      roleFormModal: ModalDriver;

      #permissionsMultiSelect: MultiSelectDriver;

      #submitMode: 'create' | 'duplicate' = 'create';

      #pendingPrefill: RoleFormData | null = null;

      openRoleModal(
        mode: 'create' | 'duplicate' = 'create',
        prefill?: RoleFormData,
      ) {
        this.#submitMode = mode;
        this.#pendingPrefill = prefill ?? null;
        this.roleFormModal.open();
      }

      async #initRoleFormModal() {
        this.roleFormModal = this.createModal();
        this.roleFormModal.setContent(
          createTemplate(
            // await import('../../../../../../test/mocks/createRoleModalMock').then(module => module.default)
            await this.fetchWidgetPage('create-role-modal.html'),
          ),
        );

        const cancelButton = new ButtonDriver(
          () =>
            this.roleFormModal.ele?.querySelector('[data-id="modal-cancel"]'),
          { logger: this.logger },
        );
        cancelButton.onClick(() => {
          this.roleFormModal.close();
          this.resetFormData(this.roleFormModal.ele);
        });

        const submitButton = new ButtonDriver(
          () =>
            this.roleFormModal.ele?.querySelector('[data-id="modal-submit"]'),
          { logger: this.logger },
        );
        submitButton.onClick(async () => {
          if (this.validateForm(this.roleFormModal.ele)) {
            const formData = this.getFormData(this.roleFormModal.ele);
            if (this.#submitMode === 'duplicate') {
              this.actions.duplicateRole({ ...formData });
            } else {
              this.actions.createRole({ ...formData });
            }
            this.roleFormModal.close();
            this.resetFormData(this.roleFormModal.ele);
          }
        });

        this.#permissionsMultiSelect = new MultiSelectDriver(
          () =>
            this.roleFormModal.ele?.querySelector(
              '[data-id="permissions-multiselect"]',
            ),
          { logger: this.logger },
        );

        this.#updatePermissionsMultiSelect();

        // Apply pre-fill (Duplicate flow) just before the modal renders.
        // The permissions multi-select refresh is awaited first to ensure
        // the form components are hydrated before setFormData runs
        // (matches the Edit modal pattern).
        this.roleFormModal.beforeOpen = async () => {
          await this.#updatePermissionsMultiSelect();
          if (this.#pendingPrefill) {
            this.setFormData(this.roleFormModal.ele, this.#pendingPrefill);
            this.#pendingPrefill = null;
          }
        };
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

        this.#initRoleFormModal();
      }
    },
);
