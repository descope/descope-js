import {
  FilterColumn,
  FilterDriver,
  FilterEventDetail,
  FilterRow,
} from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
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

      // Raw `data` attribute string we last wrote. Used to distinguish our own
      // writes from external ones in the MutationObserver below.
      #lastWrittenDataAttr: string | null = null;

      #onApply = (detail: FilterEventDetail) => {
        const rows: FilterRow[] = Array.isArray(detail?.value)
          ? detail.value
          : [];
        this.actions.searchUsers({
          ...filterToSearchParams(rows, this.filter.data),
          page: 0,
        });
      };

      #onClear = () => {
        this.actions.searchUsers({
          ...filterToSearchParams([], this.filter.data),
          page: 0,
        });
      };

      #syncColumns = () => {
        if (!this.filter?.isExists) return;

        const tenantRoles = getTenantRoles(this.state);
        const customAttrs = getCustomAttributes(this.state);

        // Defer #originalCols snapshot until CAs resolve. Initial data attr
        // may arrive without CA cols (console-app writes them asynchronously
        // after the CA fetch). Freezing too early loses CA cols permanently.
        if (!this.#originalCols) {
          if (customAttrs === undefined) return;
          this.#originalCols = Object.freeze(this.filter.data.slice());
        }

        // Resolve the published pick list against runtime state: populate/hide
        // the Roles column, then enrich any custom-attribute columns.
        let cols: FilterColumn[] = this.#originalCols.slice();
        cols = applyFilterRolesColumn(cols, tenantRoles);
        cols = enrichFilterCustomAttributeColumns(cols, customAttrs);

        this.filter.data = cols;
        this.#lastWrittenDataAttr = JSON.stringify(cols);
      };

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        const filterEle = this.shadowRoot?.querySelector('descope-filter');
        this.filter = new FilterDriver(filterEle, { logger: this.logger });
        if (!this.filter.isExists) return;

        // Watch the `data` attribute for external changes (e.g. screen editor
        // republishing a reduced pick list). Our own writes also fire here
        // but match `#lastWrittenDataAttr`, so they're skipped.
        if (filterEle) {
          const observer = new MutationObserver(() => {
            const current = filterEle.getAttribute('data') ?? '[]';
            if (current === this.#lastWrittenDataAttr) return;
            this.#originalCols = null;
            this.#syncColumns();
          });
          observer.observe(filterEle, {
            attributes: true,
            attributeFilter: ['data'],
          });
        }

        this.#syncColumns();
        this.subscribe(this.#syncColumns, getTenantRoles);
        this.subscribe(this.#syncColumns, getCustomAttributes);

        this.filter.onApply(this.#onApply);
        this.filter.onClear(this.#onClear);
      }
    },
);
