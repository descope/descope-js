import { SingleSelectDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { getUserTenants, getCurrentTenantId } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initTenantSelectorMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class TenantSelectorMixinClass extends compose(
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      tenantSelector: SingleSelectDriver;

      #initTenantSelector() {
        const ele = this.shadowRoot?.querySelector(
          'descope-combo-box[name="currentTenantSelector"]',
        );

        if (!ele) {
          return;
        }

        this.tenantSelector = new SingleSelectDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-combo-box[name="currentTenantSelector"]',
            ),
          { logger: this.logger },
        );

        this.tenantSelector.ele.addEventListener('change', (e: InputEvent) => {
          const tenantId = (e.target as HTMLInputElement)?.value;
          if (tenantId) {
            this.actions.selectTenant(tenantId);
          }
        });
      }

      async #updateTenantSelector(
        userTenants: ReturnType<typeof getUserTenants>,
      ) {
        const options = userTenants.map((tenant) => ({
          label: tenant.tenantName || tenant.tenantId,
          value: tenant.tenantId,
        }));

        await this.tenantSelector.setData(options);
      }

      async #updateComboBox() {
        await this.#updateTenantSelector(getUserTenants(this.state));
        await this.#updateSelectedTenant(getCurrentTenantId(this.state));
      }

      async #updateSelectedTenant(tenantId: string | null) {
        this.tenantSelector.value = tenantId || '';
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initTenantSelector();
        await this.#updateComboBox();

        this.subscribe(this.#updateComboBox.bind(this), getUserTenants);
      }
    },
);
