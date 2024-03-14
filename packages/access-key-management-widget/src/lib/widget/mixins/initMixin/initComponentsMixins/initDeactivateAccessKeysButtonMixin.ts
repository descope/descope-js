import { compose } from '../../../../helpers/compose';
import { withMemCache } from '../../../../helpers/generic';
import { createSingletonMixin } from '../../../../helpers/mixins';
import { loggerMixin } from '../../../../mixins/loggerMixin';
import { ButtonDriver } from '../../../drivers/ButtonDriver';
import { getIsAccessKeysSelected } from '../../../state/selectors';
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
        (isSelected: ReturnType<typeof getIsAccessKeysSelected>) => {
          if (isSelected) {
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
          getIsAccessKeysSelected,
        );
      }
    },
);
