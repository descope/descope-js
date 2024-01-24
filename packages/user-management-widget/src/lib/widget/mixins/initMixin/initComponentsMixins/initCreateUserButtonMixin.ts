import { compose } from '../../../../helpers/compose';
import { createSingletonMixin } from '../../../../helpers/mixins';
import { loggerMixin } from '../../../../mixins/loggerMixin';
import { ButtonDriver } from '../../../drivers/ButtonDriver';
import { initCreateUserModalMixin } from './initCreateUserModalMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initCreateUserButtonMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitCreateUserButtonMixinClass extends compose(
      loggerMixin,
      initCreateUserModalMixin,
      initWidgetRootMixin,
    )(superclass) {
      createButton: ButtonDriver;

      #initCreateButton() {
        this.createButton = new ButtonDriver(
          this.shadowRoot?.querySelector('[data-id="create-user"]'),
          { logger: this.logger },
        );
        this.createButton.onClick(() => this.createUserModal.open());
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initCreateButton();
      }
    },
);
