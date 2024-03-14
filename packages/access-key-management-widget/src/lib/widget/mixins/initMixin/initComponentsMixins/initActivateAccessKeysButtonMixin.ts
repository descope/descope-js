import { compose } from '../../../../helpers/compose';
import { withMemCache } from '../../../../helpers/generic';
import { createSingletonMixin } from '../../../../helpers/mixins';
import { loggerMixin } from '../../../../mixins/loggerMixin';
import { ButtonDriver } from '../../../drivers/ButtonDriver';
import { getIsAccessKeysSelected } from '../../../state/selectors';
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
        (isSelected: ReturnType<typeof getIsAccessKeysSelected>) => {
          if (isSelected) {
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
          getIsAccessKeysSelected,
        );
      }
    },
);
