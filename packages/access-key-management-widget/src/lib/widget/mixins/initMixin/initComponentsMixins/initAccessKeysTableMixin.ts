import { GridDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  debounce,
  withMemCache,
} from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { AccessKey } from '../../../api/types';
import { getAccessKeysList } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initAccessKeysTableMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitAccessKeysTableMixinClass extends compose(
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      accessKeysTable: GridDriver<AccessKey>;

      #initAccessKeysTable() {
        this.accessKeysTable = new GridDriver(
          this.shadowRoot?.querySelector('[data-id="access-keys-table"]'),
          { logger: this.logger },
        );
        this.accessKeysTable.onSelectedItemsChange((e) => {
          this.actions.setSelectedAccessKeysIds(
            e.detail.value.map(({ name }) => name),
          );
        });
      }

      #onAccessKeysListUpdate = withMemCache(
        (accessKeysList: ReturnType<typeof getAccessKeysList>) => {
          this.accessKeysTable.data = accessKeysList;
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
          this.actions.searchAccessKeys({ sort });
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initAccessKeysTable();
        this.accessKeysTable.columns.forEach((column) => {
          column.onSortDirectionChange((e: MouseEvent) => {
            this.#onColumnSortChange(e.target, e.detail);
          });
        });

        // because we are not waiting for the rest calls,
        // we need to make sure the table is updated with the received access keys
        this.#onAccessKeysListUpdate(getAccessKeysList(this.state));
        this.subscribe(
          this.#onAccessKeysListUpdate.bind(this),
          getAccessKeysList,
        );
      }
    },
);
