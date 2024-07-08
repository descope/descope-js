import { ButtonDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { formMixin, loggerMixin } from '@descope/sdk-mixins';
import { getCanEnable } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initEnableUserModalMixin } from './initEnableUserModalMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initEnableUserButtonMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitEnableUserButtonMixinClass extends compose(
      loggerMixin,
      initWidgetRootMixin,
      stateManagementMixin,
      initEnableUserModalMixin,
      formMixin,
    )(superclass) {
      enableButton: ButtonDriver;

      #initEnableButton() {
        this.enableButton = new ButtonDriver(
          this.shadowRoot?.querySelector('[data-id="enable-user"]'),
          { logger: this.logger },
        );

        this.enableButton.disable();
        this.enableButton.onClick(() => {
          this.enableUserModal.open();
        });
      }

      #onIsUserSelectedUpdate = withMemCache(
        (canEnable: ReturnType<typeof getCanEnable>) => {
          if (canEnable) {
            this.enableButton.enable();
          } else {
            this.enableButton.disable();
          }
        },
      );

      async onWidgetRootReady() {
        this.#initEnableButton();

        await super.onWidgetRootReady?.();

        this.subscribe(this.#onIsUserSelectedUpdate.bind(this), getCanEnable);
      }
    },
);
