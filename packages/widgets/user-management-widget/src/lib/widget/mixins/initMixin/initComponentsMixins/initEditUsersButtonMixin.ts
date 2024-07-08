import { ButtonDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { formMixin, loggerMixin } from '@descope/sdk-mixins';
import { getCanEdit } from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initEditUserModalMixin } from './initEditUserModalMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initEditUserButtonMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitEditUserButtonMixinClass extends compose(
      loggerMixin,
      initWidgetRootMixin,
      stateManagementMixin,
      initEditUserModalMixin,
      formMixin,
    )(superclass) {
      editButton: ButtonDriver;

      #initEditButton() {
        this.editButton = new ButtonDriver(
          this.shadowRoot?.querySelector('[data-id="edit-user"]'),
          { logger: this.logger },
        );
        this.editButton.disable();
        this.editButton.onClick(() => {
          this.editUserModal.open();
        });
      }

      #onIsUserSelectedUpdate = withMemCache(
        (canEdit: ReturnType<typeof getCanEdit>) => {
          if (canEdit) {
            this.editButton.enable();
          } else {
            this.editButton.disable();
          }
        },
      );

      async onWidgetRootReady() {
        this.#initEditButton();

        await super.onWidgetRootReady?.();

        this.subscribe(this.#onIsUserSelectedUpdate.bind(this), getCanEdit);
      }
    },
);
