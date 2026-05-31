import { ButtonDriver } from '@descope/sdk-component-drivers';
import {
  compose,
  createSingletonMixin,
  withMemCache,
} from '@descope/sdk-helpers';
import { loggerMixin } from '@descope/sdk-mixins';
import {
  getIsSingleRolesSelected,
  getSelectedRoles,
} from '../../../state/selectors';
import { stateManagementMixin } from '../../stateManagementMixin';
import { initRoleFormModalMixin } from './initRoleFormModalMixin';
import { initWidgetRootMixin } from './initWidgetRootMixin';

export const initDuplicateRoleButtonMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class InitDuplicateRoleButtonMixinClass extends compose(
      loggerMixin,
      initWidgetRootMixin,
      stateManagementMixin,
      initRoleFormModalMixin,
    )(superclass) {
      duplicateButton: ButtonDriver;

      #initDuplicateButton() {
        this.duplicateButton = new ButtonDriver(
          this.shadowRoot?.querySelector('[data-id="duplicate-role"]'),
          { logger: this.logger },
        );
        this.duplicateButton.disable();
        this.duplicateButton.onClick(() => {
          const role = getSelectedRoles(this.state)?.[0];
          if (!role) return;
          this.openRoleModal('duplicate', {
            name: `${role.name} Copy`,
            description: role.description,
            permissionNames: role.permissionNames,
          });
        });
      }

      #onIsSingleRoleSelectedUpdate = withMemCache(
        (isSingleSelected: ReturnType<typeof getIsSingleRolesSelected>) => {
          if (isSingleSelected) {
            this.duplicateButton.enable();
          } else {
            this.duplicateButton.disable();
          }
        },
      );

      async onWidgetRootReady() {
        await super.onWidgetRootReady?.();

        this.#initDuplicateButton();

        this.subscribe(
          this.#onIsSingleRoleSelectedUpdate.bind(this),
          getIsSingleRolesSelected,
        );
      }
    },
);
