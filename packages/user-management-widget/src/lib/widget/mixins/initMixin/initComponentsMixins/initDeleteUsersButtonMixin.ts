import { ButtonDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
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
        this.#initDeleteButton();

        await super.onWidgetRootReady?.();

        this.subscribe(
          this.#onIsUserSelectedUpdate.bind(this),
          getIsUsersSelected,
        );
      }
    },
);
