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

        this.tenantSelector.onInput(this.#onInput);
      }

      #onInput = (e) => {
        const tenantId = e.target.value;
        if (tenantId) {
          this.actions.selectTenant(tenantId);
        }
      };

      async #updateTenantSelector(
        userTenants: ReturnType<typeof getUserTenants>,
      ) {
        const options = userTenants.map((tenant) => ({
          label: tenant.tenantName || tenant.tenantId,
          value: tenant.tenantId,
        }));

        await this.tenantSelector.setData(options);
      }

      #updateComboBox() {
        this.#updateTenantSelector(getUserTenants(this.state));
        this.#updateSelectedTenant(getCurrentTenantId(this.state));
      }

      #updateSelectedTenant(tenantId: string | null) {
        this.tenantSelector.value = tenantId || '';
      }

      // We need to work around the combo box's internal state to set the initial value which
      // has a slight delay when setting value directly
      #updateInitialValue() {
        this.tenantSelector.ele.setAttribute('allow-custom-value', 'true');
        setTimeout(() => {
          this.#updateSelectedTenant(getCurrentTenantId(this.state));
          this.tenantSelector.ele.removeAttribute('allow-custom-value');
          this.#updateTenantSelector(getUserTenants(this.state));
        });
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initTenantSelector();

        if (!this.tenantSelector) {
          return;
        }

        this.#updateInitialValue();

        this.subscribe(this.#updateComboBox.bind(this), getUserTenants);
      }
    },
);
