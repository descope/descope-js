import {
  ButtonDriver,
  ModalDriver,
  MultiSelectDriver,
  TextFieldDriver,
} from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  createTemplate,
} from '@descope/sdk-helpers';
import { formMixin, loggerMixin, modalMixin } from '@descope/sdk-mixins';
import parsePhone from 'libphonenumber-js/min';
import { User } from '../../../api/types';
import { getSelectedUsers, getTenantRoles } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

const unflattenKeys = ['customAttributes'];

const unflatten = (formData: Partial<User>) =>
  Object.entries(formData).reduce((acc, [key, value]) => {
    const [prefix, ...rest] = key.split('.');

    if (!unflattenKeys.includes(prefix)) {
      return Object.assign(acc, { [key]: value });
    }

    if (!acc[prefix]) {
      acc[prefix] = {};
    }

    acc[prefix][rest.join('.')] = value;

    return acc;
  }, {});

const flatten = (
  vals: Record<string, string | boolean | number>,
  keyPrefix: string,
) =>
  Object.fromEntries(
    Object.entries(vals).map(([key, val]) => [`${keyPrefix}${key}`, val]),
  );

const formatPhoneNumber = (phoneNumber: string) => {
  if (!phoneNumber) return phoneNumber;

  const parsedPhone = parsePhone(phoneNumber);
  const splitCodeRegex = new RegExp(
    `(\\+?${parsedPhone?.countryCallingCode})(.*)`,
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
              ...unflatten(formData),
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
          ...flatten(userDetails.customAttributes, 'customAttributes.'),
        };

        this.setFormData(this.editUserModal.ele, formData);
      };

      async #initEditUserModal() {
        this.editUserModal = this.createModal();
        this.editUserModal.setContent(
          createTemplate(await this.fetchWidgetPage('edit-user-modal.html')),
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
