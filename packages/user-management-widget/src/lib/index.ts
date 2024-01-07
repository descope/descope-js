/* eslint-disable no-param-reassign */
import { compose } from './helpers/compose';
import { createStateManagementMixin } from './mixins/createStateManagementMixin';
import { debuggerMixin } from './mixins/debuggerMixin';
import { modalMixin } from './mixins/modalMixin/modalMixin';
import { themeMixin } from './mixins/themeMixin';
import widgetTemplate from './mockTemplates/widgetTemplate';
import createUserTemplate from './mockTemplates/createUserTemplate';
import deleteUserTemplate from './mockTemplates/deleteUsersTemplate';
import ResetUsersPasswordTemplate from './mockTemplates/ResetUsersPasswordTemplate';

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

const stateMixin = createStateManagementMixin({
  name: 'users',
  initialState: {
    usersList: [],
    filter: '',
    selectedUsersIds: []
  },
  reducers: {
    addUser: (state, { payload }) => {
      state.usersList.push(payload);
    },
    deleteSelectedUsers: (state) => {
      state.usersList = state.usersList.filter(user => !state.selectedUsersIds.includes(user.id));
      state.selectedUsersIds = [];
    },
    updateTable: (state, { payload }) => {
      // eslint-disable-next-line no-param-reassign
      state.usersList = payload;
    },
    setFilter: (state, { payload }) => {
      // eslint-disable-next-line no-param-reassign
      state.filter = payload;
    },
    setSelectedUsersIds: (state, { payload }) => {
      // eslint-disable-next-line no-param-reassign
      state.selectedUsersIds = payload;
    }
  }
});

const initMixin = (superclass: CustomElementConstructor) =>
  class InitMixinClass extends compose(themeMixin, debuggerMixin, stateMixin, modalMixin)(superclass) {
    // eslint-disable-next-line class-methods-use-this
    async getTemplate(templateString: string) {
      const template = document.createElement('template');
      template.innerHTML = templateString;

      return template;
    }

    addUserModal;

    deleteUsersModal;

    resetUsersPasswordModal;

    addButton;

    deleteButton;

    resetPasswordButton;

    usersTable;

    search;

    state;

    // TODO: think if we need some Abstraction here? seems too specific
    async initAddUserModal() {
      const modalTemplate = await this.getTemplate(createUserTemplate);
      this.addUserModal = this.createModal('add-user-modal');
      this.addUserModal.setModalContent(modalTemplate.content);
      this.addUserModal.attachModalEvent('click', '#modal-cancel', () => this.addUserModal.closeModal());
      this.addUserModal.attachModalEvent('click', '#modal-submit', () => {
        this.actions.addUser(this.addUserModal.getModalFormData());
        this.addUserModal.closeModal();
        this.addUserModal.setModalFormData({ email: '', name: '', phone: '' });
      });
    }

    async initDeleteUserModal() {
      const modalTemplate = await this.getTemplate(deleteUserTemplate);
      this.deleteUsersModal = this.createModal('delete-user-modal');
      this.deleteUsersModal.setModalContent(modalTemplate.content);
      this.deleteUsersModal.attachModalEvent('click', '#modal-cancel', () => this.deleteUsersModal.closeModal());
      this.deleteUsersModal.attachModalEvent('click', '#modal-submit', () => {
        this.actions.deleteSelectedUsers();
        this.deleteUsersModal.closeModal();
      });
    }

    async initResetUsersPasswordModal() {
      const modalTemplate = await this.getTemplate(ResetUsersPasswordTemplate);
      this.resetUsersPasswordModal = this.createModal('reset-user-password-modal');
      this.resetUsersPasswordModal.setModalContent(modalTemplate.content);
      this.resetUsersPasswordModal.attachModalEvent('click', '#modal-cancel', () => this.deleteUsersModal.closeModal());
      this.resetUsersPasswordModal.attachModalEvent('click', '#modal-submit', () => {
        //TODO: reset password
        this.resetUsersPasswordModal.closeModal();
      });
    }

    updateUsersTable({ usersList, filter }) {
      if (this.usersTable) {
        if (!filter) {
          this.usersTable.data = usersList;
        } else {
          const lowercaseFilter = filter.toLowerCase();
          // TODO: filter by all fields?
          this.usersTable.data = usersList.filter(user => Object.keys(user).some(field => user[field].toLowerCase?.().includes?.(lowercaseFilter)));
        }
      }
    }

    async initWidget() {
      const template = await this.getTemplate(widgetTemplate);
      await this.loadDescopeUiComponents(template.content);

      this.contentRootElement.append(template.content.cloneNode(true));

      // TODO: do we need Abstraction here? what if there are multiple identical elements?
      this.addButton = this.shadowRoot?.getElementById('add');
      this.deleteButton = this.shadowRoot?.getElementById('delete');
      this.resetPasswordButton = this.shadowRoot?.getElementById('reset');
      this.deleteButton.setAttribute('disabled', 'true');
      this.resetPasswordButton.setAttribute('disabled', 'true');
      this.resetPasswordButton = this.shadowRoot?.getElementById('reset');
      this.usersTable = this.shadowRoot?.querySelector('descope-grid') as HTMLElement & { data: Record<string, string> };
      this.search = this.shadowRoot?.getElementById('search');

      // TODO: use reselect & think if we can manage state updates in a better way
      this.subscribe((state) => {
        this.state = state;
        this.updateUsersTable(state);

        const isUsersSelected = !!state.selectedUsersIds.length;
        this.deleteButton.setAttribute('disabled', !isUsersSelected);
        this.resetPasswordButton.setAttribute('disabled', !isUsersSelected);
      });

      // TODO: seems too specific, think what can be done
      this.search?.addEventListener('input', (e) => this.actions.setFilter(e.target.value));
      this.addButton?.addEventListener('click', () => this.addUserModal.showModal());
      this.deleteButton?.addEventListener('click', () => {
        const numOfSelectedUsers = this.state.selectedUsersIds.length;
        this.deleteUsersModal.modal.querySelector('#body-text').innerHTML = `Delete ${numOfSelectedUsers} user${numOfSelectedUsers > 1 ? 's' : ''}?`;
        this.deleteUsersModal.showModal();
      });
      this.resetPasswordButton?.addEventListener('click', () => {
        const numOfSelectedUsers = this.state.selectedUsersIds.length;
        this.resetUsersPasswordModal.modal.querySelector('#body-text').innerHTML = `Reset password for ${numOfSelectedUsers} user${numOfSelectedUsers > 1 ? 's' : ''}?`;
        this.resetUsersPasswordModal.showModal();
      });
      this.usersTable?.addEventListener('selected-items-changed', (e) => this.actions.setSelectedUsersIds(e.detail.value.map(({ id }) => id)));
    }

    // TODO: is there a better way for managing async actions? thunk?
    async fetchUsers() {
      const res = await fetch('https://dummyjson.com/users');
      const body = await res.json();
      this.actions.updateTable(body.users);
    }

    async init() {
      await super.init?.();

      await this.initWidget();

      this.initAddUserModal();

      this.initDeleteUserModal();

      this.initResetUsersPasswordModal();

      this.fetchUsers();
    }
  };

customElements.define(
  'user-management-widget',
  compose(initMixin)(HTMLElement),
);
