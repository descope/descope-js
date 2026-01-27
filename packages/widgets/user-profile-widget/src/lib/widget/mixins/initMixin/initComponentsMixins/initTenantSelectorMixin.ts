import { TenantSelectorDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  createOperationStateHandler,
} from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { getUserTenants, getCurrentTenantId } from '../../../state/selectors';
import { getCurrentTenantFromSession } from '../../../state/helpers';
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

      // Store previous tenant ID for error recovery
      #previousTenantId: string | null = null;
      #isSelecting: boolean = false;

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

        // Store the current tenant ID before attempting to switch
        this.#previousTenantId = getCurrentTenantId(this.state);

        // Mark that we're selecting to track state changes
        this.#isSelecting = true;

        // Call the selectTenant action
        await this.actions.selectTenant(nextTenantId);
      };

      // State change handler that tracks the selectTenant operation lifecycle.
      // Reverts the UI selection if the operation fails, or dispatches tenant-changed event on success.
      #onSelectTenantStateChange = createOperationStateHandler({
        isActive: () => this.#isSelecting,
        setActive: (active) => {
          this.#isSelecting = active;
        },
        getOperationState: (state) => state.selectTenant,
        onSuccess: () => this.#onTenantChange(),
        onError: () => this.#revertSelection(),
      });

      // Revert the combobox value to the previous tenant
      #revertSelection() {
        if (this.#previousTenantId !== null) {
          this.tenantSelector.value = this.#previousTenantId;
        }
      }

      #onTenantChange() {
        const tenantId = getCurrentTenantId(this.state);

        this.dispatchEvent(
          new CustomEvent('tenant-changed', {
            bubbles: true,
            composed: true,
            detail: { tenantId },
          }),
        );

        // Only reload if the tenant actually changed (not on init or same tenant)
        if (
          this.tenantSelector.shouldReload &&
          tenantId !== this.#previousTenantId
        ) {
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

        this.subscribe(this.#onSelectTenantStateChange.bind(this));
      }
    },
);
