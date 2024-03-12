import { compose } from '../../../../helpers/compose';
import { createSingletonMixin } from '../../../../helpers/mixins';
import { loggerMixin } from '../../../../mixins/loggerMixin';
import { ButtonDriver } from '../../../drivers/ButtonDriver';
import { initCreateRoleModalMixin } from './initCreateRoleModalMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initCreateRoleButtonMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitCreateRoleButtonMixinClass extends compose(
      loggerMixin,
      initCreateRoleModalMixin,
      initWidgetRootMixin,
    )(superclass) {
      createButton: ButtonDriver;

      #initCreateButton() {
        this.createButton = new ButtonDriver(
          this.shadowRoot?.querySelector('[data-id="create-role"]'),
          { logger: this.logger },
        );
        this.createButton.onClick(() => this.createRoleModal.open());
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initCreateButton();
      }
    },
);
