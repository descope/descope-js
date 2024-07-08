import { GridDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  debounce,
  withMemCache,
} from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { Role } from '../../../api/types';
import { getRolesList } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initRolesTableMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitRolesTableMixinClass extends compose(
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      rolesTable: GridDriver<Role>;

      #initRolesTable() {
        this.rolesTable = new GridDriver(
          this.shadowRoot?.querySelector('[data-id="roles-table"]'),
          { logger: this.logger },
        );
        this.rolesTable.onSelectedItemsChange((e) => {
          this.actions.setSelectedRolesIds(
            e.detail.value.map(({ name }) => name),
          );
        });
      }

      #onRolesListUpdate = withMemCache(
        (rolesList: ReturnType<typeof getRolesList>) => {
          this.rolesTable.data = rolesList;
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
          this.actions.searchRoles({ sort });
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initRolesTable();
        this.rolesTable.columns.forEach((column) => {
          column.onSortDirectionChange((e: MouseEvent) => {
            this.#onColumnSortChange(e.target, e.detail);
          });
        });

        // because we are not waiting for the rest calls,
        // we need to make sure the table is updated with the received roles
        this.#onRolesListUpdate(getRolesList(this.state));
        this.subscribe(this.#onRolesListUpdate.bind(this), getRolesList);
      }
    },
);
