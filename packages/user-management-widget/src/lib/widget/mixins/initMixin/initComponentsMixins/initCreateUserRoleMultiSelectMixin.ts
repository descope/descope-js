import { compose } from '../../../../helpers/compose';
import { createSingletonMixin } from '../../../../helpers/mixins';
import { loggerMixin } from '../../../../mixins/loggerMixin';
import { MultiSelectDriver } from '../../../drivers/MultiSelectDriver';
import { getTenantRoles } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initCreateUserRoleMultiSelectMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitCreateUserRoleMultiSelectMixin extends compose(
      loggerMixin,
      stateManagementMixin,
      initWidgetRootMixin,
    )(superclass) {
      tenantRoles: any;

      rolesMultiSelect: MultiSelectDriver;

      #initMultiSelect() {
        this.rolesMultiSelect = new MultiSelectDriver(
          () => this.shadowRoot?.querySelector('[data-id="roles-multiselect"]'),
          { logger: this.logger },
        );
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();
        this.#initMultiSelect();
        await this.rolesMultiSelect.setData(
          getTenantRoles(this.state).map(({ name }) => ({
            value: name,
            label: name,
          })),
        );
      }
    },
);
