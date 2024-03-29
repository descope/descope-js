import { ButtonDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { formMixin, loggerMixin } from '@descope/sdk-mixins';
import { getCanRemovePasskey } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initRemovePasskeyModalMixin } from './initRemovePasskeyModalMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initRemovePasskeyButtonMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitRemovePasskeyButtonMixinClass extends compose(
      loggerMixin,
      initWidgetRootMixin,
      stateManagementMixin,
      initRemovePasskeyModalMixin,
      formMixin,
    )(superclass) {
      removePasskeyButton: ButtonDriver;

      #initRemovePasskeyButton() {
        this.removePasskeyButton = new ButtonDriver(
          this.shadowRoot?.querySelector('[data-id="remove-passkey"]'),
          { logger: this.logger },
        );

        this.removePasskeyButton.disable();
        this.removePasskeyButton.onClick(() => {
          this.removePasskeyModal.open();
        });
      }

      #onIsUserSelectedUpdate = withMemCache(
        (canRemovePasskey: ReturnType<typeof getCanRemovePasskey>) => {
          if (canRemovePasskey) {
            this.removePasskeyButton.enable();
          } else {
            this.removePasskeyButton.disable();
          }
        },
      );

      async onWidgetRootReady() {
        this.#initRemovePasskeyButton();

        await super.onWidgetRootReady?.();

        this.subscribe(
          this.#onIsUserSelectedUpdate.bind(this),
          getCanRemovePasskey,
        );
      }
    },
);
