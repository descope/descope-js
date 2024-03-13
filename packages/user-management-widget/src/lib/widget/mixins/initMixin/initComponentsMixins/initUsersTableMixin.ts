import { GridDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  debounce,
  withMemCache,
} from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { User } from '../../../api/types';
import { getUsersList } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initUsersTableMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitUsersTableMixinClass extends compose(
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      usersTable: GridDriver<User>;

      #initUsersTable() {
        this.usersTable = new GridDriver(
          this.shadowRoot?.querySelector('[data-id="users-table"]'),
          { logger: this.logger },
        );
        this.usersTable.onSelectedItemsChange((e) => {
          this.actions.setSelectedUsersIds(
            e.detail.value.map(({ loginIds }) => loginIds),
          );
        });
      }

      #onUsersListUpdate = withMemCache(
        (usersList: ReturnType<typeof getUsersList>) => {
          this.usersTable.data = usersList as User[];
        },
      );

      #onColumnSortChange = debounce(
        (
          ele: HTMLElement & { path: string },
          detail: { value: 'asc' | 'desc' | null },
        ) => {
          const sort = [];
          const { value } = detail;
          if (value) {
            const field = ele.path;
            sort.push({ field, desc: value === 'desc' });
          }
          this.actions.searchUsers({ sort });
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initUsersTable();
        this.usersTable.columns.forEach((column) => {
          column.onSortDirectionChange((e: MouseEvent) => {
            this.#onColumnSortChange(e.target, e.detail);
          });
        });

        // because we are not waiting for the rest calls,
        // we need to make sure the table is updated with the received users
        this.#onUsersListUpdate(getUsersList(this.state));
        this.subscribe(this.#onUsersListUpdate.bind(this), getUsersList);
      }
    },
);
