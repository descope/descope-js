import { ButtonDriver } from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin, modalMixin } from '@descope/sdk-mixins';
import {
  isNativeBridgeAvailable,
  requestNativeLogout,
} from '../../nativeBridgeMixin';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initLogoutMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class LogoutMixinClass extends compose(
      stateManagementMixin,
      loggerMixin,
      initWidgetRootMixin,
      modalMixin,
    )(superclass) {
      logout: ButtonDriver;

      #initLogout() {
        this.logout = new ButtonDriver(
          () =>
            this.shadowRoot?.querySelector('descope-button[data-id="logout"]'),
          { logger: this.logger },
        );

        this.logout.onClick(async () => {
          // In native mode the host SDK owns logout
          if (isNativeBridgeAvailable()) {
            requestNativeLogout();
            return;
          }
          await this.actions.logout();
          this.dispatchEvent(new CustomEvent('logout'));
        });
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initLogout();
      }
    },
);
