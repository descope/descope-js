import { TextFieldDriver } from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin, debounce } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initFilterAccessKeysInputMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitFilterAccessKeysInputMixinClass extends compose(
      loggerMixin,
      initWidgetRootMixin,
      stateManagementMixin,
    )(superclass) {
      searchInput: TextFieldDriver;

      #onInput = debounce(() => {
        this.actions.searchAccessKeys({ text: this.searchInput.value });
      });

      #initSearchInput() {
        // currently we are doing it on client side because we assume there will not be more than 10000 access keys per tenant
        this.searchInput = new TextFieldDriver(
          this.shadowRoot?.querySelector('[data-id="search-input"]'),
          { logger: this.logger },
        );
        this.searchInput.onInput(this.#onInput);
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initSearchInput();
      }
    },
);
