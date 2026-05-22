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

// Defense-in-depth: older widget HTML saved on the backend contains a broken
// HTML5 `pattern` for Permitted IPs (stripped backslashes, JS-literal slashes)
// so valid IPv4/CIDR values fail checkValidity(). Override at runtime until
// affected widgets are re-saved. Source-of-truth fix: descope/console-app#5272.
export const PERMITTED_IPS_PATTERN =
  '(?:(?:\\d{1,3}\\.){3}\\d{1,3}(?:\\/(?:\\d|[1-2]\\d|3[0-2]))?|(?:[a-fA-F0-9]{1,4}:){1,7}[a-fA-F0-9]{1,4}(?:\\/\\d{1,3})?)';

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

        // Override the Permitted IPs pattern for widgets whose saved HTML still
        // carries the broken regex. No-op when the input is absent.
        this.createAccessKeyModal.ele
          ?.querySelector('[data-id="ips-multiselect"]')
          ?.setAttribute('pattern', PERMITTED_IPS_PATTERN);

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
              {
                ...this.getFormData(this.createAccessKeyModal.ele),
              },
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
