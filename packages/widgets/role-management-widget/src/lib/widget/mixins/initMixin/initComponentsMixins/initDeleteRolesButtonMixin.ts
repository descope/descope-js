import { ButtonDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import { getIsRolesSelected } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initDeleteRolesModalMixin } from './initDeleteRolesModalMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initDeleteRolesButtonMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitDeleteRolesButtonMixinClass extends compose(
      loggerMixin,
      initWidgetRootMixin,
      stateManagementMixin,
      initDeleteRolesModalMixin,
    )(superclass) {
      deleteButton: ButtonDriver;

      #initDeleteButton() {
        this.deleteButton = new ButtonDriver(
          this.shadowRoot?.querySelector('[data-id="delete-roles"]'),
          { logger: this.logger },
        );
        this.deleteButton.disable();
        this.deleteButton.onClick(() => {
          this.deleteRolesModal.open();
        });
      }

      #onIsRoleSelectedUpdate = withMemCache(
        (isSelected: ReturnType<typeof getIsRolesSelected>) => {
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
          this.#onIsRoleSelectedUpdate.bind(this),
          getIsRolesSelected,
        );
      }
    },
);
