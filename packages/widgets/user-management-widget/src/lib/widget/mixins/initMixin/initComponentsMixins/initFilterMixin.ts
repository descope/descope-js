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
import { getCustomAttributes, getTenantRoles } from '../../../state/selectors';
import { filterToSearchParams } from '../../../state/filterToSearchParams';
import { CustomAttributeTypeMap } from '../../../api/types';

const ROLES_COLUMN_ID = 'roles';
const CA_COL_PREFIX = 'customAttributes.';

// Map CustomAttribute proto `type` → filter inputType + operator allowlist.
// v0: equality only across the board (date intentionally omitted — no BE
// op support yet). Widen when BE confirms richer ops on `customAttributes`.
const CA_TYPE_TO_FILTER: Record<
  number,
  Pick<FilterColumn, 'inputType'> & { operators: string[] }
> = {
  [CustomAttributeTypeMap.text]: {
    inputType: 'text',
    operators: ['equal', 'is-empty'],
  },
  [CustomAttributeTypeMap.numeric]: {
    inputType: 'number',
    operators: ['equal', 'is-empty'],
  },
  [CustomAttributeTypeMap.bool]: {
    inputType: 'boolean',
    operators: ['equal', 'is-empty'],
  },
  [CustomAttributeTypeMap.singleSelect]: {
    inputType: 'singleselect',
    operators: ['equal', 'is-empty'],
  },
  [CustomAttributeTypeMap.array]: {
    inputType: 'multiselect',
    operators: ['is-any-of', 'is-empty'],
  },
};

const toFilterOption = (raw: unknown): FilterOption => {
  if (typeof raw === 'string') return { value: raw, label: raw };
  const o = raw as { value?: string; label?: string };
  const value = o?.value ?? '';
  return { value, label: o?.label ?? value };
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

      #enrichCustomAttributeCol = (
        col: FilterColumn,
        customAttrs: ReturnType<typeof getCustomAttributes>,
      ): FilterColumn => {
        const name = col.id.slice(CA_COL_PREFIX.length);
        const attr = customAttrs?.find((a: any) => a.name === name);
        if (!attr) return col;
        const map = CA_TYPE_TO_FILTER[attr.type];
        if (!map) return col; // unsupported type (e.g. date) — leave as-is
        const rawOptions = (attr as any).options;
        const options =
          Array.isArray(rawOptions) && rawOptions.length
            ? rawOptions.map(toFilterOption)
            : undefined;
        return {
          ...col,
          label: col.label || (attr as any).displayName || name,
          inputType: map.inputType,
          operators: map.operators,
          ...(options ? { options } : {}),
        };
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

        let cols: FilterColumn[] = this.#originalCols.slice();

        // Roles col: hide when no tenant roles; populate options when present.
        if (!tenantRoles?.length) {
          cols = cols.filter((c) => c?.id !== ROLES_COLUMN_ID);
        } else {
          const roleOptions: FilterOption[] = tenantRoles.map((r: any) => ({
            value: r.name,
            label: r.name,
          }));
          cols = cols.map((c) =>
            c?.id === ROLES_COLUMN_ID ? { ...c, options: roleOptions } : c,
          );
        }

        // Custom attribute cols: enrich any col with id prefix `customAttributes.`
        // using runtime CA schema. Authoring opt-in lives in console-app —
        // widget never auto-injects, only enriches what the admin picked.
        cols = cols.map((c) =>
          c?.id?.startsWith(CA_COL_PREFIX)
            ? this.#enrichCustomAttributeCol(c, customAttrs)
            : c,
        );

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
