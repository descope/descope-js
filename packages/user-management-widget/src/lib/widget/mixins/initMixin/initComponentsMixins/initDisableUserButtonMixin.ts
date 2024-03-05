import { compose } from '../../../../helpers/compose';
import { withMemCache } from '../../../../helpers/generic';
import { createSingletonMixin } from '../../../../helpers/mixins';
import { formMixin } from '../../../../mixins/formMixin';
import { loggerMixin } from '../../../../mixins/loggerMixin';
import { ButtonDriver } from '../../../drivers/ButtonDriver';
import { getIsSelectedUsersEnabled } from '../../../state/selectors';
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
        (isEnabled: ReturnType<typeof getIsSelectedUsersEnabled>) => {
          if (isEnabled) {
            this.disableButton.enable();
          } else {
            this.disableButton.disable();
          }
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initDisableButton();

        this.subscribe(
          this.#onIsUserSelectedUpdate.bind(this),
          getIsSelectedUsersEnabled,
        );
      }
    },
);
