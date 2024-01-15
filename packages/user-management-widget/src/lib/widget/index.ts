import { compose } from '../helpers/compose';
import { debuggerMixin } from '../mixins/debuggerMixin';
import { modalMixin } from '../mixins/modalMixin';
import { themeMixin } from '../mixins/themeMixin';
import widgetTemplate from './mockTemplates/widgetTemplate';
import createUserTemplate from './mockTemplates/createUserTemplate';
import deleteUserTemplate from './mockTemplates/deleteUsersTemplate';
import ResetUsersPasswordTemplate from './mockTemplates/ResetUsersPasswordTemplate';
import { stateMixin } from './state/stateMixin';
import { getFilteredUsers, getIsUsersSelected, getSelectedUsersDetailsForDisplay, getSelectedUsersIds } from './state/selectors';
import { createTemplate } from '../helpers/dom';
import { apiMixin } from './apiMixin';
import { ModalDriver } from './drivers/ModalDriver';
import { State } from './state/types';
import { ButtonDriver } from './drivers/ButtonDriver';
import { GridDriver } from './drivers/GridDriver';
import { User } from './apiMixin/types';
import { TextFieldDriver } from './drivers/TextFieldDriver';
import { TextDriver } from './drivers/TextDriver';
import { formMixin } from '../mixins/formMixin';

declare global {
  interface HTMLElement {
    attributeChangedCallback(
      attrName: string,
      oldValue: string | null,
      newValue: string | null,
    ): void;
    connectedCallback(): void;
  }
}

const initMixin = (superclass: CustomElementConstructor) =>
  class InitMixinClass extends compose(
    themeMixin,
    debuggerMixin,
    stateMixin,
    modalMixin,
    apiMixin,
    formMixin
  )(superclass) {
    addUserModal: ModalDriver;

    deleteUsersModal: ModalDriver;

    resetUsersPasswordModal: ModalDriver;

    addButton: ButtonDriver;

    deleteButton: ButtonDriver;

    resetPasswordButton: ButtonDriver;

    usersTable: GridDriver<User>;

    searchInput: TextFieldDriver;

    state: State;

    async initCreateUserModal() {
      this.addUserModal = this.createModal();
      this.addUserModal.setContent(createTemplate(createUserTemplate));

      const cancelButton = new ButtonDriver(() => this.addUserModal.ele.querySelector('#modal-cancel'), { logger: this.logger });
      cancelButton.onClick(() => this.addUserModal.close());

      const submitButton = new ButtonDriver(() => this.addUserModal.ele.querySelector('#modal-submit'), { logger: this.logger });
      submitButton.onClick(async () => {
        if (this.validateForm(this.addUserModal.ele)) {
          this.actions.createUser(this.getFormData(this.addUserModal.ele));
          this.addUserModal.close();
          this.resetFormData(this.addUserModal.ele);
        }
      });
    }

    async initDeleteUserModal() {
      this.deleteUsersModal = this.createModal();
      this.deleteUsersModal.setContent(createTemplate(deleteUserTemplate));

      const cancelButton = new ButtonDriver(() => this.deleteUsersModal.ele.querySelector('#modal-cancel'), { logger: this.logger });
      cancelButton.onClick(() => this.deleteUsersModal.close());

      const submitButton = new ButtonDriver(() => this.deleteUsersModal.ele.querySelector('#modal-submit'), { logger: this.logger });
      submitButton.onClick(() => {
        const selectedUsersIds = getSelectedUsersIds(this.state);
        selectedUsersIds.forEach((userIds: string[]) => {
          this.actions.deleteUser(userIds);
        });
        this.deleteUsersModal.close();
      });
    }

    async initResetUsersPasswordModal() {
      this.resetUsersPasswordModal = this.createModal();
      this.resetUsersPasswordModal.setContent(createTemplate(ResetUsersPasswordTemplate));

      const submitButton = new ButtonDriver(() => this.resetUsersPasswordModal.ele.querySelector('#modal-cancel'), { logger: this.logger });
      submitButton.onClick(() => this.resetUsersPasswordModal.close());

      const cancelButton = new ButtonDriver(() => this.resetUsersPasswordModal.ele.querySelector('#modal-submit'), { logger: this.logger });
      cancelButton.onClick(() => {
        const selectedUsersIds = getSelectedUsersIds(this.state);
        selectedUsersIds.forEach((userIds: string[]) => {
          this.actions.expireUserPassword(userIds);
        });
        this.resetUsersPasswordModal.close();
      });
    }

    initDeleteButton() {
      this.deleteButton = new ButtonDriver(this.shadowRoot?.getElementById('delete'), { logger: this.logger });
      //TODO: do we want to call subscribe with init state instead?
      this.deleteButton.disable();
      this.deleteButton.onClick(() => {
        const userDetails = getSelectedUsersDetailsForDisplay(this.state);
        new TextDriver(this.deleteUsersModal.ele.querySelector('#body-text'), { logger: this.logger }).text = `Delete ${userDetails}?`;
        this.deleteUsersModal.open();
      });
    }

    initAddButton() {
      this.addButton = new ButtonDriver(this.shadowRoot?.getElementById('add'), { logger: this.logger });
      this.addButton.onClick(() => this.addUserModal.open());
    }

    initResetPasswordButton() {
      this.resetPasswordButton = new ButtonDriver(this.shadowRoot?.getElementById('reset'), { logger: this.logger });
      this.resetPasswordButton.disable();
      this.resetPasswordButton?.onClick(() => {
        const userDetails = getSelectedUsersDetailsForDisplay(this.state);
        new TextDriver(this.resetUsersPasswordModal.ele.querySelector('#body-text'), { logger: this.logger }).text = `Reset password for ${userDetails}?`;
        this.resetUsersPasswordModal.open();
      });
    }

    initSearchInput() {
      // currently we are doing it on client side because we assume there will not be more than 10000 users per tenant
      this.searchInput = new TextFieldDriver(this.shadowRoot?.getElementById('search'), { logger: this.logger });
      this.searchInput.onInput((e: InputEvent & { target: HTMLInputElement }) => this.actions.setFilter(e.target.value));
    }

    initUsersTable() {
      this.usersTable = new GridDriver(this.shadowRoot?.querySelector('descope-grid'), { logger: this.logger });
      this.usersTable.onSelectedItemsChange((e) => this.actions.setSelectedUsersIds(e.detail.value.map(({ loginIds }) => loginIds)));
    }

    async loadWidgetTemplate() {
      const template = createTemplate(widgetTemplate);
      await this.loadDescopeUiComponents(template);
      this.contentRootElement.append(template.content.cloneNode(true));
    }

    onStateChange(state: State) {
      console.log(state);
      this.state = state;
      this.usersTable.data = getFilteredUsers(state);

      if (getIsUsersSelected(state)) {
        this.deleteButton.enable();
        this.resetPasswordButton.enable();
      } else {
        this.deleteButton.disable();
        this.resetPasswordButton.disable();
      }
    }

    async initWidget() {
      await this.loadWidgetTemplate();

      this.initAddButton();
      this.initDeleteButton();
      this.initResetPasswordButton();
      this.initSearchInput();
      this.initUsersTable();
      this.initCreateUserModal();
      this.initDeleteUserModal();
      this.initResetUsersPasswordModal();

      this.subscribe(this.onStateChange.bind(this));
    }

    async init() {
      await super.init?.();

      await this.initWidget();

      this.actions.searchUsers();
    }
  };

export const UserManagementWidget = compose(initMixin)(HTMLElement);

