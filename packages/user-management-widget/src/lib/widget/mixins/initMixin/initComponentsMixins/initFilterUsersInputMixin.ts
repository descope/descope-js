import { compose } from '../../../../helpers/compose';
import { createSingletonMixin } from '../../../../helpers/mixins';
import { loggerMixin } from '../../../../mixins/loggerMixin';
import { TextFieldDriver } from '../../../drivers/TextFieldDriver';
import { initWidgetRootMixin } from './initWidgetRootMixin';
import { stateManagementMixin } from '../../stateManagementMixin';

export const initFilterUsersInputMixin = createSingletonMixin(<T extends CustomElementConstructor>(superclass: T) =>
  class InitFilterUsersInputMixinClass extends compose(loggerMixin, initWidgetRootMixin, stateManagementMixin)(superclass) {

    searchInput: TextFieldDriver;

    #initSearchInput() {
      // currently we are doing it on client side because we assume there will not be more than 10000 users per tenant
      this.searchInput = new TextFieldDriver(this.shadowRoot?.querySelector('[data-id="search-input"]'), { logger: this.logger });
      this.searchInput.onInput((e: InputEvent & { target: HTMLInputElement }) => this.actions.setFilter(e.target.value));
    }

    async onWidgetRootReady() {
      await super.onWidgetRootReady?.();

      this.#initSearchInput();
    }
  });
