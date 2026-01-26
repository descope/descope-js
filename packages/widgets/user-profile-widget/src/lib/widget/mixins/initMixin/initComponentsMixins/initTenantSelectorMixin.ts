import { TenantSelectorDriver } from '@descope/sdk-component-drivers';
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
      tenantSelector: TenantSelectorDriver;

      #init = true;

      #initTenantSelector() {
        this.tenantSelector = new TenantSelectorDriver(
          () => this.shadowRoot?.querySelector('descope-tenant-selector'),
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

      #onTenantChange() {
        const tenantId = getCurrentTenantId(this.state);

        switch (this.tenantSelector.action) {
          case 'reload':
            window.location.reload();
            break;
          case 'dispatch':
            this.dispatchEvent(
              new CustomEvent('tenant-change', {
                bubbles: true,
                composed: true,
                detail: { tenantId },
              }),
            );
            break;
          default:
            break;
        }
      }

      #onInput = async (e) => {
        await this.actions.setCurrentTenant(e.target.value);
        this.#onTenantChange();
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
