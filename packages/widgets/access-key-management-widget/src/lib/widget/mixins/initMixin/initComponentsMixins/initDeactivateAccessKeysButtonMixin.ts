import { ButtonDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { getCanModifyAccessKeys } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initDeactivateAccessKeysModalMixin } from './initDeactivateAccessKeysModalMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initDeactivateAccessKeysButtonMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitDeactivateAccessKeysButtonMixinClass extends compose(
      loggerMixin,
      initWidgetRootMixin,
      stateManagementMixin,
      initDeactivateAccessKeysModalMixin,
    )(superclass) {
      deactivateButton: ButtonDriver;

      #initDeactivateButton() {
        this.deactivateButton = new ButtonDriver(
          this.shadowRoot?.querySelector('[data-id="deactivate-access-keys"]'),
          { logger: this.logger },
        );
        this.deactivateButton.disable();
        this.deactivateButton.onClick(() => {
          this.deactivateAccessKeysModal.open();
        });
      }

      #onIsAccessKeySelectedUpdate = withMemCache(
        (canModify: ReturnType<typeof getCanModifyAccessKeys>) => {
          if (canModify) {
            this.deactivateButton.enable();
          } else {
            this.deactivateButton.disable();
          }
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initDeactivateButton();

        this.subscribe(
          this.#onIsAccessKeySelectedUpdate.bind(this),
          getCanModifyAccessKeys,
        );
      }
    },
);
