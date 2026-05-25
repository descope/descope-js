import {
  ButtonDriver,
  ModalDriver,
  MultiLineMappingsDriver,
  MultiSelectDriver,
} from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  createTemplate,
} from '@descope/sdk-helpers';
import {
  formMixin,
  loggerMixin,
  modalMixin,
  widgetConfigMixin,
} from '@descope/sdk-mixins';
import { unflatten } from '../../../../helpers';
import {
  getCustomAttributes,
  getTenantRoles,
  getSubTenantRolesData,
  getHasSubTenants,
} from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initCreateUserModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitCreateUserModalMixinClass extends compose(
      stateManagementMixin,
      modalMixin,
      formMixin,
      loggerMixin,
      widgetConfigMixin,
      initWidgetRootMixin,
    )(superclass) {
      createUserModal: ModalDriver;

      #rolesMultiSelect: MultiSelectDriver;

      #subTenantSection: Element;

      #subTenantMappings: MultiLineMappingsDriver;

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
        const resetModal = () => {
          this.resetFormData(this.createUserModal.ele);
          this.#subTenantMappings.value = [];
        };

        cancelButton.onClick(() => {
          this.createUserModal.close();
          resetModal();
        });

        const submitButton = new ButtonDriver(
          () =>
            this.createUserModal.ele?.querySelector('[data-id="modal-submit"]'),
          { logger: this.logger },
        );
        submitButton.onClick(async () => {
          if (this.validateForm(this.createUserModal.ele)) {
            const formData = this.getFormData(this.createUserModal.ele);
            const userTenants = this.#subTenantMappings.mergedValue;
            this.actions.createUser({
              ...unflatten(formData, 'customAttributes'),
              userTenants,
              invite: true,
              verifiedEmail: true,
              verifiedPhone: true,
            });
            this.createUserModal.close();
            resetModal();
          }
        });

        this.#rolesMultiSelect = new MultiSelectDriver(
          () =>
            this.createUserModal.ele?.querySelector(
              '[data-id="roles-multiselect"]',
            ),
          { logger: this.logger },
        );

        this.#subTenantSection = this.createUserModal.ele?.querySelector(
          '[data-id="sub-tenant-section"]',
        );
        this.#subTenantMappings = new MultiLineMappingsDriver(
          () =>
            this.createUserModal.ele?.querySelector(
              '[data-id="sub-tenant-mappings"]',
            ),
          { logger: this.logger },
        );

        this.#updateRolesMultiSelect();

        this.createUserModal.beforeOpen = async () => {
          const widgetConfig = await this.getWidgetConfig();
          await Promise.all([
            this.actions.getTenantRoles(),
            ...(widgetConfig?.allowSubTenants
              ? [this.actions.getSubTenantRoles()]
              : []),
          ]);
          await this.#updateRolesMultiSelect();
          this.#updateSubTenantSection();
          this.#updateCustomFields();
        };
      }

      // hide and disable fields according to user permissions
      #updateCustomFields() {
        const customAttrs = getCustomAttributes(this.state);

        this.getFormFieldNames(this.createUserModal.ele).forEach(
          (fieldName: string) => {
            const [prefix, name] = fieldName.split('.');

            if (prefix !== 'customAttributes') {
              return;
            }

            const matchingCustomAttr = customAttrs.find(
              (attr) => attr.name === name,
            );

            if (!matchingCustomAttr) {
              this.removeFormField(this.createUserModal.ele, fieldName);
            } else if (!matchingCustomAttr.editable) {
              this.disableFormField(this.createUserModal.ele, fieldName);
            }
          },
        );
      }

      #updateRolesMultiSelect = async () => {
        await this.#rolesMultiSelect.setData(
          getTenantRoles(this.state).map(({ name }) => ({
            value: name,
            label: name,
          })),
        );
      };

      #updateSubTenantSection = () => {
        const hasSubTenants = getHasSubTenants(this.state);
        // hide the sub-tenant section when there are no sub-tenants to assign
        this.#subTenantSection?.classList.toggle('hidden', !hasSubTenants);
        if (hasSubTenants) {
          this.#subTenantMappings.setData(getSubTenantRolesData(this.state));
        }
      };

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initCreateUserModal();
      }
    },
);
