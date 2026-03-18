import { TenantSelectorDriver } from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { getUserTenants, getCurrentTenantId } from '../../../state/selectors';
import { getCurrentTenantFromSession } from '../../../state/helpers';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { State } from '../../../state/types';

export const initTenantSelectorMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class TenantSelectorMixinClass extends compose(
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
    )(superclass) {
      tenantSelector: TenantSelectorDriver;
      #lastProcessedTenantId: string | null = null;

      #initTenantSelector() {
        this.tenantSelector = new TenantSelectorDriver(
          () =>
            this.shadowRoot?.querySelector(
              'descope-combo-box[name="tenantSelector"]',
            ),
          { logger: this.logger },
        );

        this.tenantSelector.onInput(this.#onInput);
      }

      #onInput = async (e: InputEvent) => {
        const nextTenantId = (e.target as HTMLInputElement).value;

        // Call the selectTenant action (value already set by user interaction)
        await this.actions.selectTenant(nextTenantId);
      };

      // State change handler that syncs Redux state to UI
      #onTenantStateChange = (state: State) => {
        const currentTenantId = getCurrentTenantId(state);

        // Sync Redux state to combobox (handles both success and revert)
        if (this.tenantSelector.value !== currentTenantId) {
          this.#setSelectedItem(currentTenantId);
        }

        // Only dispatch event on successful completion (no error, not loading, previous cleared)
        // AND the tenant has actually changed from what we last processed
        const { loading, error } = state.selectTenant;
        const hasPreviousTenant = state.tenant.previousTenantId !== null;
        const tenantChanged = currentTenantId !== this.#lastProcessedTenantId;

        if (
          currentTenantId &&
          !loading &&
          !error &&
          !hasPreviousTenant &&
          tenantChanged
        ) {
          this.#lastProcessedTenantId = currentTenantId;
          this.#onTenantChange();
        }
      };

      #onTenantChange() {
        const tenantId = getCurrentTenantId(this.state);

        this.dispatchEvent(
          new CustomEvent('tenant-changed', {
            bubbles: true,
            composed: true,
            detail: { tenantId },
          }),
        );

        if (this.tenantSelector.shouldReload) {
          this.#reloadPage();
        }
      }

      #reloadPage() {
        setTimeout(
          () => window.location.reload(),
          this.tenantSelector.refreshTimeout,
        );
      }

      async #updateOptions(userTenants: ReturnType<typeof getUserTenants>) {
        const options = userTenants.map((tenant) => ({
          label: tenant.tenantName || tenant.tenantId,
          value: tenant.tenantId,
        }));

        await this.tenantSelector.setData(options);
      }

      #setSelectedItem(tenantId: string | null) {
        if (!tenantId) {
          return;
        }

        this.tenantSelector.value = tenantId;
      }

      // We need to work around the combo box's internal state to set the initial value which
      // has a slight delay when setting it directly, because the combobox data is not yet ready.
      #setInitialValue() {
        this.tenantSelector.setAllowCustomValue(true);
        setTimeout(() => {
          this.#setSelectedItem(getCurrentTenantId(this.state));
          this.tenantSelector.setAllowCustomValue(false);
        });
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.actions.setCurrentTenantId(getCurrentTenantFromSession());

        this.#initTenantSelector();
        this.#setInitialValue();
        this.#updateOptions(getUserTenants(this.state));

        this.subscribe(this.#onTenantStateChange.bind(this));
      }
    },
);
