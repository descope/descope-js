import { compose } from '../../../../helpers/compose';
import { withMemCache } from '../../../../helpers/generic';
import { createSingletonMixin } from '../../../../helpers/mixins';
import { loggerMixin } from '../../../../mixins/loggerMixin';
import { User } from '../../../api/types';
import { GridDriver } from '../../../drivers/GridDriver';
import { getFilteredUsers } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initUsersTableMixin = createSingletonMixin(<T extends CustomElementConstructor>(superclass: T) =>
  class InitUsersTableMixinClass extends compose(stateManagementMixin, loggerMixin, initWidgetRootMixin)(superclass) {

    usersTable: GridDriver<User>;

    #initUsersTable() {
      this.usersTable = new GridDriver(this.shadowRoot?.querySelector('[data-id="users-table"]'), { logger: this.logger });
      this.usersTable.onSelectedItemsChange((e) => {
        this.actions.setSelectedUsersIds(e.detail.value.map(({ loginIds }) => loginIds));
      });
    }

    #onUsersListUpdate = withMemCache((usersList: ReturnType<typeof getFilteredUsers>) => {
      this.usersTable.data = usersList;
    });

    async onWidgetRootReady() {
      await super.onWidgetRootReady?.();

      this.#initUsersTable();

      this.subscribe(this.#onUsersListUpdate.bind(this), getFilteredUsers);
    }
  });
