import { ButtonDriver } from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { loggerMixin, modalMixin } from '@descope/sdk-mixins';
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

      // Overridable: nativeBridgeMixin wraps this to route through the host SDK
      // when the native bridge is present.
      async handleLogout() {
        await this.actions.logout();
        this.dispatchEvent(new CustomEvent('logout'));
      }

      #initLogout() {
        this.logout = new ButtonDriver(
          () =>
            this.shadowRoot?.querySelector('descope-button[data-id="logout"]'),
          { logger: this.logger },
        );

        this.logout.onClick(() => this.handleLogout());
      }

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initLogout();
      }
    },
);
