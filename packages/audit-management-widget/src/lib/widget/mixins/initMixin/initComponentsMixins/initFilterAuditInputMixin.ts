import {
  TextFieldDriver,
  SingleSelectDriver,
} from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin, debounce } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initFilterAuditInputMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitFilterAuditInputMixinClass extends compose(
      loggerMixin,
      initWidgetRootMixin,
      stateManagementMixin,
    )(superclass) {
      searchInput: TextFieldDriver;

      rangeInput: SingleSelectDriver;

      #onInput = debounce(() => {
        const timePeriod = this.rangeInput.value;
        const today = new Date();
        let from: number;
        switch (timePeriod) {
          case 'minuets15':
            from = today.setMinutes(today.getMinutes() - 15);
            break;
          case 'hour':
            from = today.setHours(today.getHours() - 1);
            break;
          case 'hour6':
            from = today.setHours(today.getHours() - 6);
            break;
          case 'day':
            from = today.setDate(today.getDate() - 1);
            break;
          case 'day3':
            from = today.setDate(today.getDate() - 3);
            break;
          case 'week':
            from = today.setDate(today.getDate() - 7);
            break;
          case 'week2':
            from = today.setDate(today.getDate() - 14);
            break;
          case 'month':
            from = today.setMonth(today.getMonth() - 1);
            break;
          default:
            // default to one day
            from = today.setDate(today.getDate() - 1);
        }

        this.actions.searchAudit({
          text: this.searchInput.value,
          from: Math.floor(new Date(from).getTime()),
        });
      });

      #initSearchInput() {
        // currently we are doing it on client side because we assume there will not be more than 10000 audit per tenant
        this.searchInput = new TextFieldDriver(
          this.shadowRoot?.querySelector('[data-id="search-input"]'),
          { logger: this.logger },
        );
        this.searchInput.onInput(this.#onInput);
      }

      #initRangeInput() {
        this.rangeInput = new SingleSelectDriver(
          this.shadowRoot?.querySelector('[data-id="range-input"]'),
          { logger: this.logger },
        );
        this.rangeInput.onInput(this.#onInput);
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initSearchInput();
        this.#initRangeInput();
      }
    },
);
