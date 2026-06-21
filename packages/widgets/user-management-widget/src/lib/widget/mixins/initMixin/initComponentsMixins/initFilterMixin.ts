import {
  FilterColumn,
  FilterDriver,
  FilterEventDetail,
  FilterOption,
  FilterRow,
} from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { getTenantRoles } from '../../../state/selectors';
import { filterToSearchParams } from '../../../state/filterToSearchParams';

const ROLES_COLUMN_ID = 'roles';

export const initFilterMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitFilterMixinClass extends compose(
      loggerMixin,
      initWidgetRootMixin,
      stateManagementMixin,
    )(superclass) {
      filter: FilterDriver;

      // Snapshot of published columns (incl. Roles). Frozen once captured to
      // protect against accidental mutation through driver writes.
      #originalCols: readonly FilterColumn[] | null = null;

      #onApply = (detail: FilterEventDetail) => {
        const rows: FilterRow[] = Array.isArray(detail?.value)
          ? detail.value
          : [];
        this.actions.searchUsers({
          ...filterToSearchParams(rows),
          page: 0,
        });
      };

      #onClear = () => {
        this.actions.searchUsers({ ...filterToSearchParams([]), page: 0 });
      };

      #setRolesOptions = (cols: FilterColumn[], options: FilterOption[]) => {
        const next = cols.map((c) =>
          c?.id === ROLES_COLUMN_ID ? { ...c, options } : c,
        );
        this.filter.data = next;
      };

      #syncRolesColumn = (tenantRoles: ReturnType<typeof getTenantRoles>) => {
        if (!this.filter?.isExists) return;
        if (!this.#originalCols)
          this.#originalCols = Object.freeze(this.filter.data.slice());

        if (!tenantRoles?.length) {
          // No roles in project → hide the Roles col from the filter UI.
          this.filter.data = this.#originalCols.filter(
            (c) => c?.id !== ROLES_COLUMN_ID,
          );
          return;
        }

        // Restore Roles col + populate options with current tenant roles.
        this.#setRolesOptions(
          this.#originalCols.slice(),
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

        this.#syncRolesColumn(getTenantRoles(this.state));
        this.subscribe(this.#syncRolesColumn, getTenantRoles);

        this.filter.onApply(this.#onApply);
        this.filter.onClear(this.#onClear);
      }
    },
);
