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
    apiMixin
  )(superclass) {
    addUserModal;

    deleteUsersModal;

    resetUsersPasswordModal;

    addButton;

    deleteButton;

    resetPasswordButton;

    usersTable;

    search;

    state;

    // TODO: replace modal mixin with modal driver
    async initCreateUserModal() {
      const modalTemplate = createTemplate(createUserTemplate);
      this.addUserModal = this.createModal('create-user-modal');
      this.addUserModal.setModalContent(modalTemplate.content);
      this.addUserModal.attachModalEvent('click', '#modal-cancel', () => this.addUserModal.closeModal());
      this.addUserModal.attachModalEvent('click', '#modal-submit', async () => {
        this.actions.createUser(this.addUserModal.getModalFormData());
        this.addUserModal.closeModal();
        this.addUserModal.setModalFormData({ email: '', displayName: '', phone: '', loginId: '' });
      });
    }

    async initDeleteUserModal() {
      const modalTemplate = createTemplate(deleteUserTemplate);
      this.deleteUsersModal = this.createModal('delete-user-modal');
      this.deleteUsersModal.setModalContent(modalTemplate.content);
      this.deleteUsersModal.attachModalEvent('click', '#modal-cancel', () => this.deleteUsersModal.closeModal());
      this.deleteUsersModal.attachModalEvent('click', '#modal-submit', () => {
        const selectedUsersIds = getSelectedUsersIds(this.state);
        selectedUsersIds.forEach((userIds: string[]) => {
          this.actions.deleteUser(userIds);
        });
        this.deleteUsersModal.closeModal();
      });
    }

    async initResetUsersPasswordModal() {
      const modalTemplate = createTemplate(ResetUsersPasswordTemplate);
      this.resetUsersPasswordModal = this.createModal('reset-user-password-modal');
      this.resetUsersPasswordModal.setModalContent(modalTemplate.content);
      this.resetUsersPasswordModal.attachModalEvent('click', '#modal-cancel', () => this.resetUsersPasswordModal.closeModal());
      this.resetUsersPasswordModal.attachModalEvent('click', '#modal-submit', () => {
        //TODO: reset password
        this.resetUsersPasswordModal.closeModal();
      });
    }

    initDeleteButton() {
      this.deleteButton = this.shadowRoot?.getElementById('delete');
      this.deleteButton.setAttribute('disabled', 'true');
      this.deleteButton?.addEventListener('click', () => {
        const userDetails = getSelectedUsersDetailsForDisplay(this.state);
        this.deleteUsersModal.modal.querySelector('#body-text').innerHTML = `Delete ${userDetails}?`;
        this.deleteUsersModal.showModal();
      });
    }

    initAddButton() {
      this.addButton = this.shadowRoot?.getElementById('add');
      this.addButton?.addEventListener('click', () => this.addUserModal.showModal());
    }

    initResetPasswordButton() {
      this.resetPasswordButton = this.shadowRoot?.getElementById('reset');
      this.resetPasswordButton.setAttribute('disabled', 'true');
      this.resetPasswordButton?.addEventListener('click', () => {
        const userDetails = getSelectedUsersDetailsForDisplay(this.state);
        this.resetUsersPasswordModal.modal.querySelector('#body-text').innerHTML = `Reset password for ${userDetails}?`;
        this.resetUsersPasswordModal.showModal();
      });
    }

    initSearchInput() {
      this.search = this.shadowRoot?.getElementById('search');
      this.search?.addEventListener('input', (e) => this.actions.setFilter(e.target.value));
    }

    initUsersTable() {
      this.usersTable = this.shadowRoot?.querySelector('descope-grid') as HTMLElement & { data: Record<string, string> };
      this.usersTable?.addEventListener('selected-items-changed', (e) => this.actions.setSelectedUsersIds(e.detail.value.map(({ loginIds }) => loginIds)));
    }

    async initWidget() {
      const template = createTemplate(widgetTemplate);
      await this.loadDescopeUiComponents(template.content);
      this.contentRootElement.append(template.content.cloneNode(true));

      this.initAddButton();
      this.initDeleteButton();
      this.initResetPasswordButton();
      this.initSearchInput();
      this.initUsersTable();

      this.initCreateUserModal();
      this.initDeleteUserModal();
      this.initResetUsersPasswordModal();

      this.subscribe((state) => {
        this.state = state;
        this.usersTable.data = getFilteredUsers(state);

        this.deleteButton.setAttribute('disabled', !getIsUsersSelected(state));
        this.resetPasswordButton.setAttribute('disabled', !getIsUsersSelected(state));
      });
    }

    async init() {
      await super.init?.();

      await this.initWidget();

      this.actions.searchUsers();
    }
  };

export const UserManagementWidget = compose(initMixin)(HTMLElement);

