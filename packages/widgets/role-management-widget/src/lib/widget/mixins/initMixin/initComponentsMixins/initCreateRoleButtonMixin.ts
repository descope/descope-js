import { ButtonDriver } from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
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
