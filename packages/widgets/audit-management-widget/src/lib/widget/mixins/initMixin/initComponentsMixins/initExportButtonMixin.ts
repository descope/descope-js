import { ButtonDriver } from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { getAuditList } from '../../../state/selectors';
import {
  AUDIT_CSV_COLUMNS,
  downloadCsv,
  generateCsv,
} from '../../../helpers/csv';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initExportButtonMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitExportButtonMixinClass extends compose(
      loggerMixin,
      initWidgetRootMixin,
      stateManagementMixin,
    )(superclass) {
      exportButton: ButtonDriver;

      #initExportButton() {
        this.exportButton = new ButtonDriver(
          this.shadowRoot?.querySelector('[data-id="export-button"]'),
          { logger: this.logger },
        );
        this.exportButton.onClick(() => {
          const auditList = getAuditList(this.state);
          if (!auditList.length) {
            this.logger.warn('No audit data to export');
            return;
          }
          const csv = generateCsv(auditList, AUDIT_CSV_COLUMNS);
          const timestamp = new Date().toISOString().slice(0, 10);
          downloadCsv(csv, `audit_logs_${timestamp}.csv`);
        });
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();
        this.#initExportButton();
      }
    },
);
