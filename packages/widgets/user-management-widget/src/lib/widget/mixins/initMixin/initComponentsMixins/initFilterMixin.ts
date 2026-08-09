import {
  FilterColumn,
  FilterDriver,
  FilterEventDetail,
  FilterRow,
} from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { getCustomAttributes, getTenantRoles } from '../../../state/selectors';
import { filterToSearchParams } from '../../../helpers/filterToSearchParams';
import {
  applyFilterRolesColumn,
  enrichFilterCustomAttributeColumns,
} from '../../../helpers/filterColumns';

// The published columns are static; fill the runtime-only parts against current
// state: the Roles column's options from the tenant's roles (drop it when there
// are none), and custom-attribute options from the live CA schema (drop a
// deleted attribute).
const resolveColumns = (
  originalCols: readonly FilterColumn[] | null,
  tenantRoles: ReturnType<typeof getTenantRoles>,
  customAttrs: ReturnType<typeof getCustomAttributes>,
): FilterColumn[] => {
  const base = originalCols?.slice() ?? [];
  const withRoles = applyFilterRolesColumn(base, tenantRoles);
  return enrichFilterCustomAttributeColumns(withRoles, customAttrs);
};

export const initFilterMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitFilterMixinClass extends compose(
      loggerMixin,
      initWidgetRootMixin,
      stateManagementMixin,
    )(superclass) {
      filter: FilterDriver;

      // Snapshot of published columns (incl. Roles). Frozen once captured to
      // protect against accidental mutation through driver writes. Invalidated
      // when the descope-filter `data` attribute is changed externally (e.g.
      // console-app editor publishing a new pick list).
      #originalCols: readonly FilterColumn[] | null = null;

      // Build the request from the full published column set, not the trimmed
      // filter.data, so a column hidden at runtime (e.g. Roles when the tenant
      // has none) still gets its field cleared instead of lingering.
      #columnsForRequest = (): FilterColumn[] =>
        this.#originalCols ? [...this.#originalCols] : this.filter.data;

      #onApply = (detail: FilterEventDetail) => {
        const rows: FilterRow[] = Array.isArray(detail?.value)
          ? detail.value
          : [];
        this.actions.searchUsers({
          ...filterToSearchParams(rows, this.#columnsForRequest()),
          page: 0,
        });
      };

      #onClear = () => {
        this.actions.searchUsers({
          ...filterToSearchParams([], this.#columnsForRequest()),
          page: 0,
        });
      };

      // subscribe() fires on every state change, so memoize on the inputs the
      // resolved columns depend on: (#originalCols, roles, CAs). #originalCols is
      // re-snapshotted to a fresh frozen array on every external `data` change
      // (see #captureAndSync), so its ref changes and the cache busts; unrelated
      // state changes keep the same refs and skip.
      #updateColumns = withMemCache(
        (
          originalCols: readonly FilterColumn[] | null,
          tenantRoles: ReturnType<typeof getTenantRoles>,
          customAttrs: ReturnType<typeof getCustomAttributes>,
        ) => {
          this.filter.data = resolveColumns(
            originalCols,
            tenantRoles,
            customAttrs,
          );
        },
      );

      #syncColumns = () => {
        if (!this.filter?.isExists) return;
        this.#updateColumns(
          this.#originalCols,
          getTenantRoles(this.state),
          getCustomAttributes(this.state),
        );
      };

      // Snapshot the published columns (a fresh frozen array), then sync. Runs at
      // init and on every external `data` change so the memo key updates.
      #captureAndSync = () => {
        this.#originalCols = Object.freeze(this.filter.data.slice());
        this.#syncColumns();
      };

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        const filterEle = this.shadowRoot?.querySelector('descope-filter');
        this.filter = new FilterDriver(filterEle, { logger: this.logger });

        if (!this.filter.isExists) return;

        this.filter.onDataChange(this.#captureAndSync);

        this.#captureAndSync();
        this.subscribe(this.#syncColumns, getTenantRoles);
        this.subscribe(this.#syncColumns, getCustomAttributes);

        this.filter.onApply(this.#onApply);
        this.filter.onClear(this.#onClear);
      }
    },
);
