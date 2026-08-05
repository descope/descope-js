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

      // subscribe() fires on every state change, so memoize on (roles, CAs) plus
      // #originalCols. onDataChange nulls #originalCols to force a re-snapshot,
      // which busts the cache (the key changes); unrelated state changes keep the
      // same refs and skip.
      #updateColumns = withMemCache(
        (
          tenantRoles: ReturnType<typeof getTenantRoles>,
          customAttrs: ReturnType<typeof getCustomAttributes>,
          originalCols: readonly FilterColumn[] | null,
        ) => {
          // Snapshot the published columns once. If console-app later rewrites
          // the `data` attribute (e.g. adds CA columns after its fetch), the
          // driver's onDataChange handler resets #originalCols so we re-snapshot.
          if (!originalCols) {
            this.#originalCols = Object.freeze(this.filter.data.slice());
          }
          this.filter.data = this.#resolveColumns(tenantRoles, customAttrs);
        },
      );

      #syncColumns = () => {
        if (!this.filter?.isExists) return;
        this.#updateColumns(
          getTenantRoles(this.state),
          getCustomAttributes(this.state),
          this.#originalCols,
        );
      };

      // Resolve the published pick list against runtime state: populate/hide the
      // Roles column, then enrich any custom-attribute columns.
      #resolveColumns(
        tenantRoles: ReturnType<typeof getTenantRoles>,
        customAttrs: ReturnType<typeof getCustomAttributes>,
      ): FilterColumn[] {
        const base = this.#originalCols?.slice() ?? [];
        const withRoles = applyFilterRolesColumn(base, tenantRoles);
        return enrichFilterCustomAttributeColumns(withRoles, customAttrs);
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        const filterEle = this.shadowRoot?.querySelector('descope-filter');
        this.filter = new FilterDriver(filterEle, { logger: this.logger });

        if (!this.filter.isExists) return;

        this.filter.onDataChange(() => {
          this.#originalCols = null;
          this.#syncColumns();
        });

        this.#syncColumns();
        this.subscribe(this.#syncColumns, getTenantRoles);
        this.subscribe(this.#syncColumns, getCustomAttributes);

        this.filter.onApply(this.#onApply);
        this.filter.onClear(this.#onClear);
      }
    },
);
