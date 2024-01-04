import { compose } from './helpers/compose';
import { createStateManagementMixin } from './mixins/createStateManagementMixin';
import { debuggerMixin } from './mixins/debuggerMixin';
import { modalMixin } from './mixins/modalMixin/modalMixin';
import { themeMixin } from './mixins/themeMixin';
import mockTemplate from './mockTemplate';
import modalMockTemplate from './modalMockTemplate';

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
    filter: ''
  },
  reducers: {
    addUser: (state, { payload }) => {
      state.usersList.push(payload);
    },
    deleteUser: (state, { payload }) => {
      const idx = state.usersList.findIndex(
        user => Object.keys(payload).every(key => user[key] === payload[key])
      );
      if (idx > -1) {
        state.usersList.splice(idx, 1);
      }
    },
    updateTable: (state, { payload }) => {
      // eslint-disable-next-line no-param-reassign
      state.usersList = payload;
    },
    setFilter: (state, { payload }) => {
      // eslint-disable-next-line no-param-reassign
      state.filter = payload;
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

    addButton;

    deleteButton;

    usersTable;

    search;

    // TODO: think if we need some Abstraction here? seems too specific
    async initAddUserModal() {
      const modalTemplate = await this.getTemplate(modalMockTemplate);
      this.addUserModal = this.createModal('add-user-modal');
      this.addUserModal.setModalContent(modalTemplate.content);
      this.addUserModal.attachModalEvent('click', '#modal-cancel', () => this.addUserModal.closeModal());
      this.addUserModal.attachModalEvent('click', '#modal-submit', () => {
        this.actions.addUser(this.addUserModal.getModalData());
        this.addUserModal.closeModal();
        this.addUserModal.setModalData({ email: '', name: '', phone: '' });
      });
    }

    async initWidget() {
      const template = await this.getTemplate(mockTemplate);
      await this.loadDescopeUiComponents(template.content);

      this.contentRootElement.append(template.content.cloneNode(true));

      // TODO: do we need Abstraction here? what if there are multiple identical elements?
      this.addButton = this.shadowRoot?.getElementById('add');
      this.deleteButton = this.shadowRoot?.getElementById('delete');
      this.usersTable = this.shadowRoot?.querySelector('descope-grid') as HTMLElement & { data: Record<string, string> };
      this.search = this.shadowRoot?.getElementById('search');

      // TODO: use reselect & think if we can manage state updates in a better way
      this.subscribe((state) => {
        if (this.usersTable) {
          if (!state.filter) {
            this.usersTable.data = state.usersList;
          } else {
            this.usersTable.data = state.usersList.filter(user => user.email.includes(state.filter))
          }
        }
      });

      // TODO: seems too specific, think what can be done
      this.search?.addEventListener('input', (e) => this.actions.setFilter(e.target.value));
      this.addButton?.addEventListener('click', () => this.addUserModal.showModal());
      this.deleteButton?.addEventListener('click', () => this.actions.deleteUser({ email: '2@2.com' }));
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

      this.fetchUsers();
    }
  };

customElements.define(
  'user-management-widget',
  compose(initMixin)(HTMLElement),
);
