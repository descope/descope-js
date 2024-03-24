import { ButtonDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { formMixin, loggerMixin } from '@descope/sdk-mixins';
import { getCanResetPassword } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initResetPasswordModalMixin } from './initResetPasswordModalMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initResetPasswordButtonMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitResetPasswordButtonMixinClass extends compose(
      loggerMixin,
      initWidgetRootMixin,
      stateManagementMixin,
      initResetPasswordModalMixin,
      formMixin,
    )(superclass) {
      resetPasswordButton: ButtonDriver;

      #initResetPasswordButton() {
        this.resetPasswordButton = new ButtonDriver(
          this.shadowRoot?.querySelector('[data-id="reset-password"]'),
          { logger: this.logger },
        );

        this.resetPasswordButton.disable();
        this.resetPasswordButton.onClick(() => {
          this.resetPasswordModal.open();
        });
      }

      #onIsUserSelectedUpdate = withMemCache(
        (canResetPassword: ReturnType<typeof getCanResetPassword>) => {
          if (canResetPassword) {
            this.resetPasswordButton.enable();
          } else {
            this.resetPasswordButton.disable();
          }
        },
      );

      async onWidgetRootReady() {
        this.#initResetPasswordButton();

        await super.onWidgetRootReady?.();

        this.subscribe(
          this.#onIsUserSelectedUpdate.bind(this),
          getCanResetPassword,
        );
      }
    },
);
