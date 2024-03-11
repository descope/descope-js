import { compose } from '../../../../helpers/compose';
import { withMemCache } from '../../../../helpers/generic';
import { createSingletonMixin } from '../../../../helpers/mixins';
import { formMixin } from '../../../../mixins/formMixin';
import { loggerMixin } from '../../../../mixins/loggerMixin';
import { ButtonDriver } from '../../../drivers/ButtonDriver';
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

        this.subscribe(
          this.#onIsUserSelectedUpdate.bind(this),
          getCanDisable,
        );
      }
    },
);
