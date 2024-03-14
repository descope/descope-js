import { ButtonDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { formMixin, loggerMixin } from '@descope/sdk-mixins';
import { getIsSingleRolesSelected } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initEditRoleModalMixin } from './initEditRoleModalMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initEditRoleButtonMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitEditRoleButtonMixinClass extends compose(
      loggerMixin,
      initWidgetRootMixin,
      stateManagementMixin,
      initEditRoleModalMixin,
      formMixin,
    )(superclass) {
      editButton: ButtonDriver;

      #initEditButton() {
        this.editButton = new ButtonDriver(
          this.shadowRoot?.querySelector('[data-id="edit-role"]'),
          { logger: this.logger },
        );
        this.editButton.disable();
        this.editButton.onClick(() => {
          this.editRoleModal.open();
        });
      }

      #onIsRoleSelectedUpdate = withMemCache(
        (isSelected: ReturnType<typeof getIsSingleRolesSelected>) => {
          if (isSelected) {
            this.editButton.enable();
          } else {
            this.editButton.disable();
          }
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initEditButton();

        this.subscribe(
          this.#onIsRoleSelectedUpdate.bind(this),
          getIsSingleRolesSelected,
        );
      }
    },
);
