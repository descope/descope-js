import { SingleSelectDriver } from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
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

      #init = true;

      #initTenantSelector() {
        this.tenantSelector = new SingleSelectDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-combo-box[name="currentTenantSelector"]',
            ),
          { logger: this.logger },
        );

        this.tenantSelector.onInput((e) => {
          if (this.#init) {
            this.#init = false;
            return;
          }

          this.#onInput(e);
        });
      }

      #onInput = (e) => {
        const nextTenantId = e.target.value;
        const prevTenantId = getCurrentTenantId(this.state);

        if (nextTenantId && nextTenantId !== prevTenantId) {
          this.actions.setCurrentTenant(nextTenantId);
        }
      };

      async #updateOptions(userTenants: ReturnType<typeof getUserTenants>) {
        const options = userTenants.map((tenant) => ({
          label: tenant.tenantName || tenant.tenantId,
          value: tenant.tenantId,
        }));

        await this.tenantSelector.setData(options);
      }

      #setSelectedItem(tenantId: string | null) {
        this.tenantSelector.value = tenantId;
      }

      // We need to work around the combo box's internal state to set the initial value which
      // has a slight delay when setting it directly
      #setInitialValue() {
        this.tenantSelector.setAllowCustomValue(true);
        setTimeout(() => {
          this.#setSelectedItem(getCurrentTenantId(this.state));
          this.tenantSelector.setAllowCustomValue(false);
        });
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initTenantSelector();
        this.#setInitialValue();
        this.#updateOptions(getUserTenants(this.state));

        this.subscribe(this.#setSelectedItem.bind(this), getCurrentTenantId);
      }
    },
);
