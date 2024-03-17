import { ButtonDriver } from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { initCreateAccessKeyModalMixin } from './initCreateAccessKeyModalMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initCreateAccessKeyButtonMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitCreateAccessKeyButtonMixinClass extends compose(
      loggerMixin,
      initCreateAccessKeyModalMixin,
      initWidgetRootMixin,
    )(superclass) {
      createButton: ButtonDriver;

      #initCreateButton() {
        this.createButton = new ButtonDriver(
          this.shadowRoot?.querySelector('[data-id="create-access-key"]'),
          { logger: this.logger },
        );
        this.createButton.onClick(() => this.createAccessKeyModal.open());
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initCreateButton();
      }
    },
);
