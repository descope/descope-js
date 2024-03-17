import { ButtonDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { getIsAccessKeysEditable } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initActivateAccessKeysModalMixin } from './initActivateAccessKeysModalMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initActivateAccessKeysButtonMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitActivateAccessKeysButtonMixinClass extends compose(
      loggerMixin,
      initWidgetRootMixin,
      stateManagementMixin,
      initActivateAccessKeysModalMixin,
    )(superclass) {
      activateButton: ButtonDriver;

      #initActivateButton() {
        this.activateButton = new ButtonDriver(
          this.shadowRoot?.querySelector('[data-id="activate-access-keys"]'),
          { logger: this.logger },
        );
        this.activateButton.disable();
        this.activateButton.onClick(() => {
          this.activateAccessKeysModal.open();
        });
      }

      #onIsAccessKeySelectedUpdate = withMemCache(
        (editable: ReturnType<typeof getIsAccessKeysEditable>) => {
          if (editable) {
            this.activateButton.enable();
          } else {
            this.activateButton.disable();
          }
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initActivateButton();

        this.subscribe(
          this.#onIsAccessKeySelectedUpdate.bind(this),
          getIsAccessKeysEditable,
        );
      }
    },
);
