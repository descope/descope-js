import { GridDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  debounce,
  withMemCache,
} from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { User } from '../../../api/types';
import { getUsersList, getCustomAttributes } from '../../../state/selectors';
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

      // we want to keep the column configuration to make sure the table is rendered in the same way
      #setCustomRenderers() {
        const getColumnByPath = (path: string) =>
          this.usersTable.ele?.querySelector(`[path="${path}"]`);
        // relevant for selection column which does not have a path
        const getColumnByType = (type: string) => {
          const tagName = `descope-grid-${type}-column`;

          return this.usersTable.ele?.querySelector(tagName);
        };

        const origRenderColumn = this.usersTable.renderColumn;

        this.usersTable.renderColumn = ({ path, header, type, attrs }) => {
          const currentColumn = getColumnByPath(path) || getColumnByType(type);

          if (!currentColumn) {
            return origRenderColumn({ path, header, type, attrs });
          }

          const newColumn = currentColumn.cloneNode(true) as HTMLElement;

          const newAttrs: Record<string, string> = {
            ...attrs,
            header,
          };

          // update the column with the new attributes
          Object.entries(newAttrs).forEach(([key, value]) => {
            newColumn.setAttribute(key, value);
          });

          return newColumn.outerHTML;
        };
      }

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
        this.#setCustomRenderers();
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

      #onCustomAttrsUpdate = withMemCache(
        (customAttrs: ReturnType<typeof getCustomAttributes>) => {
          this.usersTable.filterColumns((col) => {
            const [prefix, name] = col.path?.split('.') || [];
            return (
              prefix !== 'customAttributes' ||
              !!customAttrs.find((attr) => attr.name === name)
            );
          });
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
        this.#onCustomAttrsUpdate(getCustomAttributes(this.state));
        this.subscribe(
          this.#onCustomAttrsUpdate.bind(this),
          getCustomAttributes,
        );
        this.subscribe(this.#onUsersListUpdate.bind(this), getUsersList);
      }
    },
);
