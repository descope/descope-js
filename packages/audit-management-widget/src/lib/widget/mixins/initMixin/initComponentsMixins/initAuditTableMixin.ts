import { GridDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { Audit } from '../../../api/types';
import { getAuditList } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initAuditTableMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitAuditTableMixinClass extends compose(
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      auditTable: GridDriver<Audit>;

      #initAuditTable() {
        this.auditTable = new GridDriver(
          this.shadowRoot?.querySelector('[data-id="audit-table"]'),
          { logger: this.logger },
        );
        this.auditTable.onSelectedItemsChange((e) => {
          this.actions.setSelectedAuditId(e.detail.value.map(({ id }) => id));
        });
      }

      #onAuditListUpdate = withMemCache(
        (auditList: ReturnType<typeof getAuditList>) => {
          this.auditTable.data = auditList;
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initAuditTable();

        // because we are not waiting for the rest calls,
        // we need to make sure the table is updated with the received audit
        this.#onAuditListUpdate(getAuditList(this.state));
        this.subscribe(this.#onAuditListUpdate.bind(this), getAuditList);
      }
    },
);
