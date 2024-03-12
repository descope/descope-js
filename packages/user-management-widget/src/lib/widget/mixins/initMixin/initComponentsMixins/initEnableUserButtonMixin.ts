import { compose } from '../../../../helpers/compose';
import { withMemCache } from '../../../../helpers/generic';
import { createSingletonMixin } from '../../../../helpers/mixins';
import { formMixin } from '../../../../mixins/formMixin';
import { loggerMixin } from '../../../../mixins/loggerMixin';
import { ButtonDriver } from '../../../drivers/ButtonDriver';
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
