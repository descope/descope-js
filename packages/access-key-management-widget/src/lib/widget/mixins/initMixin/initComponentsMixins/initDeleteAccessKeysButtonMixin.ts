import { ButtonDriver } from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin, withMemCache } from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { getIsAccessKeysSelected } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initDeleteAccessKeysModalMixin } from './initDeleteAccessKeysModalMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initDeleteAccessKeysButtonMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitDeleteAccessKeysButtonMixinClass extends compose(
      loggerMixin,
      initWidgetRootMixin,
      stateManagementMixin,
      initDeleteAccessKeysModalMixin,
    )(superclass) {
      deleteButton: ButtonDriver;

      #initDeleteButton() {
        this.deleteButton = new ButtonDriver(
          this.shadowRoot?.querySelector('[data-id="delete-access-keys"]'),
          { logger: this.logger },
        );
        this.deleteButton.disable();
        this.deleteButton.onClick(() => {
          this.deleteAccessKeysModal.open();
        });
      }

      #onIsAccessKeySelectedUpdate = withMemCache(
        (isSelected: ReturnType<typeof getIsAccessKeysSelected>) => {
          if (isSelected) {
            this.deleteButton.enable();
          } else {
            this.deleteButton.disable();
          }
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initDeleteButton();

        this.subscribe(
          this.#onIsAccessKeySelectedUpdate.bind(this),
          getIsAccessKeysSelected,
        );
      }
    },
);
