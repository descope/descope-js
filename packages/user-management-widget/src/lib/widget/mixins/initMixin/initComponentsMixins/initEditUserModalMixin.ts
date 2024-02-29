import parsePhone from 'libphonenumber-js/min';
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
import { getSelectedUsers, getTenantRoles } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

const formatPhoneNumber = (phoneNumber: string) => {
  if (!phoneNumber) return phoneNumber;

  const parsedPhone = parsePhone(phoneNumber);
  const splitCodeRegex = new RegExp(
    `(\\+?${parsedPhone.countryCallingCode})(.*)`,
  );

  return parsedPhone.number.replace(splitCodeRegex, '$1-$2');
};

export const initEditUserModalMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitEditUserModalMixinClass extends compose(
      stateManagementMixin,
      modalMixin,
      loggerMixin,
      formMixin,
      initWidgetRootMixin,
    )(superclass) {
      editUserModal: ModalDriver;

      #idInput: TextFieldDriver;

      #rolesMultiSelect: MultiSelectDriver;

      #initCancelButton() {
        const cancelButton = new ButtonDriver(
          () =>
            this.editUserModal.ele?.querySelector('[data-id="modal-cancel"]'),
          { logger: this.logger },
        );
        cancelButton.onClick(() => this.editUserModal.close());
      }

      #initSubmitButton() {
        const submitButton = new ButtonDriver(
          () =>
            this.editUserModal.ele?.querySelector('[data-id="modal-submit"]'),
          { logger: this.logger },
        );

        submitButton.onClick(() => {
          if (this.validateForm(this.editUserModal.ele)) {
            const { loginId, ...formData } = this.getFormData(
              this.editUserModal.ele,
            );
            this.actions.updateUser({
              // we are joining the ids in order to display it so we need to split it back
              loginId: loginId.split(', ')[0],
              ...formData,
            });
            this.editUserModal.close();
            this.resetFormData(this.editUserModal.ele);
          }
        });
      }

      #updateRolesMultiSelect = async () => {
        await this.#rolesMultiSelect.setData(
          getTenantRoles(this.state).map(({ name }) => ({
            value: name,
            label: name,
          })),
        );
      };

      #updateModalData = () => {
        const userDetails = getSelectedUsers(this.state)?.[0];

        const formData = {
          loginId: userDetails?.loginIds?.join(', '),
          displayName: userDetails?.name,
          email: userDetails?.email,
          phone: formatPhoneNumber(userDetails?.phone),
          roles: userDetails?.roles,
        };

        this.setFormData(this.editUserModal.ele, formData);
      };

      async #initEditUserModal() {
        this.editUserModal = this.createModal();
        this.editUserModal.setContent(
          createTemplate(
            // await this.fetchWidgetPage('edit-user-modal.html')
            `
            <descope-container data-editor-type="container" direction="column" id="ROOT" space-between="md" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="safe center" st-background-color="#80808000" st-host-width="100%" st-gap="1rem">
                <descope-text full-width="false" id="titleText" italic="false" mode="primary" text-align="center" variant="subtitle1">Edit User</descope-text>
                <descope-text-field bordered="true" full-width="true" id="loginIdInput" label="Login ID" max="100" name="loginId" placeholder="" required="true" size="sm"></descope-text-field>
                <descope-email-field bordered="true" data-errormessage-pattern-mismatch="Must be a valid email" full-width="true" id="emailInput" label="Email" max="100" name="email" pattern="^[\w\.\%\+\-]+@[\w\.\-]+\.[A-Za-z]{2,}$" placeholder="" required="false" size="sm"></descope-email-field>
                <descope-text-field border-radius="sm" bordered="true" full-width="true" id="nameInput" label="Name" max="100" name="displayName" placeholder="" required="false" size="sm"></descope-text-field>
                <descope-phone-field bordered="true" country-input-placeholder="" data-errormessage-missing-value="Required" data-errormessage-pattern-mismatch-too-short="Please enter a valid phone" default-code="autoDetect" full-width="true" id="phoneInput" label="Phone" maxlength="20" minlength="6" name="phone" phone-input-placeholder="" size="sm" type="tel"></descope-phone-field>
                <descope-multi-select-combo-box bordered="true" data-id="roles-multiselect" full-width="true" id="rolesInput" item-label-path="data-name" item-value-path="data-id" label="Roles" name="roles" size="sm" allow-custom-value="false" clear-button-visible="true"></descope-multi-select-combo-box>
                <descope-container data-editor-type="container" direction="row" id="buttonsContainer" st-horizontal-padding="0rem" st-vertical-padding="0rem" st-align-items="start" st-justify-content="flex-end" st-background-color="#ffffff00" st-host-width="100%" st-gap="0.5rem">
                    <descope-button data-id="modal-cancel" data-testid="create-user-modal-cancel" data-type="button" formNoValidate="false" full-width="false" id="createUserCancelButton" shape="" size="sm" variant="outline" mode="primary" square="false">Cancel</descope-button>
                    <descope-button data-id="modal-submit" data-testid="create-user-modal-submit" data-type="button" formNoValidate="false" full-width="false" id="createUserSubmitButton" shape="" size="sm" variant="contained" mode="primary" square="false">Update</descope-button>
                </descope-container>
            </descope-container>
            `,
          ),
        );

        this.#initCancelButton();
        this.#initSubmitButton();

        this.#idInput = new TextFieldDriver(
          this.editUserModal.ele?.querySelector('[name="loginId"]'),
          { logger: this.logger },
        );

        this.#rolesMultiSelect = new MultiSelectDriver(
          () =>
            this.editUserModal.ele?.querySelector(
              '[data-id="roles-multiselect"]',
            ),
          { logger: this.logger },
        );

        this.editUserModal.beforeOpen = async () => {
          await this.#updateRolesMultiSelect();
          this.#idInput.disable();
          this.#updateModalData();
        };
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        await this.#initEditUserModal();
      }
    },
);
