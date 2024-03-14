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

export const initCreateAccessKeyModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitCreateAccessKeyModalMixinClass extends compose(
      stateManagementMixin,
      modalMixin,
      formMixin,
      loggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      createAccessKeyModal: ModalDriver;

      #rolesMultiSelect: MultiSelectDriver;

      #expirationMultiSelect: MultiSelectDriver;

      async #initCreateAccessKeyModal() {
        this.createAccessKeyModal = this.createModal();
        this.createAccessKeyModal.setContent(
          createTemplate(
            `
            <descope-container data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="1rem">
              <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle1">New Access Key</descope-text>
              <descope-text-field bordered="true" full-width="true" id="name" label="Name" max="100" name="name" placeholder="Name" required="true" size="sm"></descope-text-field>
              <descope-multi-select-combo-box bordered="true" data-id="expiration-multiselect" full-width="true" id="expirationInput" required="true" item-label-path="data-name" item-value-path="data-id" label="Expiration" name="expiration" size="sm" allow-custom-value="false" clear-button-visible="true"></descope-multi-select-combo-box>
              <descope-multi-select-combo-box bordered="true" data-id="roles-multiselect" full-width="true" id="rolesInput" item-label-path="data-name" item-value-path="data-id" label="Roles" name="roleNames" size="sm" allow-custom-value="false" clear-button-visible="true"></descope-multi-select-combo-box>
              <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="100%" st-gap="0.5rem">
                <descope-button data-id="modal-cancel" data-testid="create-access-key-modal-cancel" data-type="button" formNoValidate="false" full-width="false" id="createAccessKeyCancelButton" shape="" size="sm" variant="outline" mode="primary" square="false">Cancel</descope-button>
                <descope-button data-id="modal-submit" data-testid="create-access-key-modal-submit" data-type="button" formNoValidate="false" full-width="false" id="createAccessKeySubmitButton" shape="" size="sm" variant="contained" mode="primary" square="false">Create</descope-button>
              </descope-container>
            </descope-container>
            `,
            // await this.fetchWidgetPage('create-access-key-modal.html'),
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
            this.actions.createAccessKey({
              ...this.getFormData(this.createAccessKeyModal.ele),
            });
            this.createAccessKeyModal.close();
            this.resetFormData(this.createAccessKeyModal.ele);
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

        this.#expirationMultiSelect = new MultiSelectDriver(
          () =>
            this.createAccessKeyModal.ele?.querySelector(
              '[data-id="expiration-multiselect"]',
            ),
          { logger: this.logger },
        );

        this.#updateExpirationMultiSelect();
      }

      #updateRolesMultiSelect = async () => {
        await this.#rolesMultiSelect.setData(
          getTenantRoles(this.state)?.map(({ name }) => ({
            value: name,
            label: name,
          })),
        );
      };

      #updateExpirationMultiSelect = async () => {
        await this.#expirationMultiSelect.setData([
          {
            value: '90',
            label: '90 Days',
          },
          {
            value: '60',
            label: '60 Days',
          },
          {
            value: '30',
            label: '30 Days',
          },
          {
            value: '0',
            label: 'Never',
          },
        ]);
      };

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initCreateAccessKeyModal();
      }
    },
);
