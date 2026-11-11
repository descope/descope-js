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
import { initCreatedAccessKeyModalMixin } from './initCreatedAccessKeyModalMixin';

const CUSTOM_ATTRIBUTES_PREFIX = 'customAttributes.';

// form fields named `customAttributes.<name>` are grouped into a `customAttributes` object
export const unflattenCustomAttributes = (formData: Record<string, any>) =>
  Object.entries(formData).reduce((acc, [key, value]) => {
    if (!key.startsWith(CUSTOM_ATTRIBUTES_PREFIX)) {
      return Object.assign(acc, { [key]: value });
    }
    if (!acc.customAttributes) {
      acc.customAttributes = {};
    }
    acc.customAttributes[key.slice(CUSTOM_ATTRIBUTES_PREFIX.length)] = value;
    return acc;
  }, {} as any);

export const initCreateAccessKeyModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitCreateAccessKeyModalMixinClass extends compose(
      stateManagementMixin,
      modalMixin,
      formMixin,
      loggerMixin,
      initWidgetRootMixin,
      initCreatedAccessKeyModalMixin,
    )(superclass) {
      createAccessKeyModal: ModalDriver;

      #rolesMultiSelect: MultiSelectDriver;

      async #initCreateAccessKeyModal() {
        this.createAccessKeyModal = this.createModal();
        this.createAccessKeyModal.setContent(
          createTemplate(
            // await import('../../../../../../test/mocks/createAccessKeyModalMock').then(module => module.default)
            await this.fetchWidgetPage('create-access-key-modal.html'),
          ),
        );

        const cancelButton = new ButtonDriver(
          () =>
            this.createAccessKeyModal.ele?.querySelector(
              '[data-id="modal-cancel"]',
            ),
          { logger: this.logger },
        );
        cancelButton.onClick(() => {
          this.createAccessKeyModal.close();
          this.resetFormData(this.createAccessKeyModal.ele);
        });

        const submitButton = new ButtonDriver(
          () =>
            this.createAccessKeyModal.ele?.querySelector(
              '[data-id="modal-submit"]',
            ),
          { logger: this.logger },
        );
        submitButton.onClick(async () => {
          if (this.validateForm(this.createAccessKeyModal.ele)) {
            const res: Record<string, any> = await this.actions.createAccessKey(
              unflattenCustomAttributes(
                this.getFormData(this.createAccessKeyModal.ele),
              ),
            );
            this.createAccessKeyModal.close();

            if (res?.payload?.cleartext) {
              this.setFormData(this.createdAccessKeyModal.ele, {
                'generated-key': res?.payload?.cleartext,
              });
              this.createdAccessKeyModal.open();
            }
          }
        });

        this.#rolesMultiSelect = new MultiSelectDriver(
          () =>
            this.createAccessKeyModal.ele?.querySelector(
              '[data-id="roles-multiselect"]',
            ),
          { logger: this.logger },
        );

        this.#updateRolesMultiSelect();

        this.createAccessKeyModal.afterClose = () => {
          this.#initCreateAccessKeyModal();
        };
      }

      #updateRolesMultiSelect = async () => {
        await this.#rolesMultiSelect.setData(
          getTenantRoles(this.state)?.map(({ name }) => ({
            value: name,
            label: name,
          })),
        );
      };

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initCreateAccessKeyModal();
      }
    },
);
