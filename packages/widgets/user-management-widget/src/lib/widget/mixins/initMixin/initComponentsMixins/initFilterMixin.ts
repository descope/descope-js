import { FilterDriver } from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { getTenantRoles } from '../../../state/selectors';
import { filterToSearchParams } from './filterToSearchParams';

const ROLES_COLUMN_ID = 'roles';

const stripRolesColumn = (cols: any[]): any[] =>
  cols.filter((c) => c?.id !== ROLES_COLUMN_ID);

export const initFilterMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitFilterMixinClass extends compose(
      loggerMixin,
      initWidgetRootMixin,
      stateManagementMixin,
    )(superclass) {
      filter: FilterDriver;

      #onApply = (detail: { value: any[] }) => {
        const rows = Array.isArray(detail?.value) ? detail.value : [];
        this.actions.searchUsers({
          ...filterToSearchParams(rows),
          page: 0,
        });
      };

      #onClear = () => {
        this.actions.searchUsers({ ...filterToSearchParams([]), page: 0 });
      };

      // Snapshot of published columns (incl. Roles). Mutated to add/remove Roles
      // based on whether tenant has any roles defined.
      #originalCols: any[] | null = null;

      #syncRolesColumn = () => {
        if (!this.filter?.isExists) return;
        if (!this.#originalCols) this.#originalCols = this.filter.data;

        const tenantRoles = getTenantRoles(this.state as any);
        if (!tenantRoles?.length) {
          // No roles in project → hide the Roles col from the filter UI.
          this.filter.data = stripRolesColumn(this.#originalCols);
          return;
        }

        // Restore Roles col + populate options with current tenant roles.
        this.filter.data = this.#originalCols;
        this.filter.setColumnOptions(
          ROLES_COLUMN_ID,
          tenantRoles.map((r: any) => ({ value: r.name, label: r.name })),
        );
      };

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.filter = new FilterDriver(
          this.shadowRoot?.querySelector('descope-filter'),
          { logger: this.logger },
        );
        if (!this.filter.isExists) return;

        this.#syncRolesColumn();
        this.subscribe(this.#syncRolesColumn);

        this.filter.onApply(this.#onApply);
        this.filter.onClear(this.#onClear);
      }
    },
);
