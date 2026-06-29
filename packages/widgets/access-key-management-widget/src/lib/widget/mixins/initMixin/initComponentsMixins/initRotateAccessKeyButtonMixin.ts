import { ButtonDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { getCanRotateAccessKey } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initRotateAccessKeyModalMixin } from './initRotateAccessKeyModalMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initRotateAccessKeyButtonMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitRotateAccessKeyButtonMixinClass extends compose(
      loggerMixin,
      initWidgetRootMixin,
      stateManagementMixin,
      initRotateAccessKeyModalMixin,
    )(superclass) {
      rotateButton: ButtonDriver;

      #initRotateButton() {
        this.rotateButton = new ButtonDriver(
          this.shadowRoot?.querySelector('[data-id="rotate-access-keys"]'),
          { logger: this.logger },
        );
        this.rotateButton.disable();
        this.rotateButton.onClick(() => {
          this.rotateAccessKeyModal.open();
        });
      }

      #onCanRotateUpdate = withMemCache(
        (canRotate: ReturnType<typeof getCanRotateAccessKey>) => {
          if (canRotate) {
            this.rotateButton.enable();
          } else {
            this.rotateButton.disable();
          }
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initRotateButton();

        this.subscribe(
          this.#onCanRotateUpdate.bind(this),
          getCanRotateAccessKey,
        );
      }
    },
);
