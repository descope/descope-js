import { ButtonDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { formMixin, loggerMixin } from '@descope/sdk-mixins';
import { getCanDisable } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initDisableUserModalMixin } from './initDisableUserModalMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initDisableUserButtonMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitDisableUserButtonMixinClass extends compose(
      loggerMixin,
      initWidgetRootMixin,
      stateManagementMixin,
      initDisableUserModalMixin,
      formMixin,
    )(superclass) {
      disableButton: ButtonDriver;

      #initDisableButton() {
        this.disableButton = new ButtonDriver(
          this.shadowRoot?.querySelector('[data-id="disable-user"]'),
          { logger: this.logger },
        );

        this.disableButton.disable();
        this.disableButton.onClick(() => {
          this.disableUserModal.open();
        });
      }

      #onIsUserSelectedUpdate = withMemCache(
        (canDisable: ReturnType<typeof getCanDisable>) => {
          if (canDisable) {
            this.disableButton.enable();
          } else {
            this.disableButton.disable();
          }
        },
      );

      async onWidgetRootReady() {
        this.#initDisableButton();

        await super.onWidgetRootReady?.();

        this.subscribe(this.#onIsUserSelectedUpdate.bind(this), getCanDisable);
      }
    },
);
