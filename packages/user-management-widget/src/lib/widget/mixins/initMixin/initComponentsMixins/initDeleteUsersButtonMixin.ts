import { compose } from '../../../../helpers/compose';
import { withMemCache } from '../../../../helpers/generic';
import { createSingletonMixin } from '../../../../helpers/mixins';
import { loggerMixin } from '../../../../mixins/loggerMixin';
import { ButtonDriver } from '../../../drivers/ButtonDriver';
import { getIsUsersSelected } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initDeleteUsersModalMixin } from './initDeleteUsersModalMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initDeleteUsersButtonMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitDeleteUsersButtonMixinClass extends compose(
      loggerMixin,
      initWidgetRootMixin,
      stateManagementMixin,
      initDeleteUsersModalMixin,
    )(superclass) {
      deleteButton: ButtonDriver;

      #initDeleteButton() {
        this.deleteButton = new ButtonDriver(
          this.shadowRoot?.querySelector('[data-id="delete-users"]'),
          { logger: this.logger },
        );
        this.deleteButton.disable();
        this.deleteButton.onClick(() => {
          this.deleteUsersModal.open();
        });
      }

      #onIsUserSelectedUpdate = withMemCache(
        (isSelected: ReturnType<typeof getIsUsersSelected>) => {
          if (isSelected) {
            this.deleteButton.enable();
          } else {
            this.deleteButton.disable();
          }
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initDeleteButton();

        this.subscribe(
          this.#onIsUserSelectedUpdate.bind(this),
          getIsUsersSelected,
        );
      }
    },
);
