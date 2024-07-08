import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { debuggerMixin, themeMixin } from '@descope/sdk-mixins';
import { initCreateRoleButtonMixin } from './initComponentsMixins/initCreateRoleButtonMixin';
import { initDeleteRolesButtonMixin } from './initComponentsMixins/initDeleteRolesButtonMixin';
import { initEditRoleButtonMixin } from './initComponentsMixins/initEditRolesButtonMixin';
import { initFilterRolesInputMixin } from './initComponentsMixins/initFilterRolesInputMixin';
import { initNotificationsMixin } from './initComponentsMixins/initNotificationsMixin';
import { initRolesTableMixin } from './initComponentsMixins/initRolesTableMixin';

export const initMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    // @ts-ignore
    class InitMixinClass extends compose(
      debuggerMixin,
      themeMixin,
      initRolesTableMixin,
      initCreateRoleButtonMixin,
      initDeleteRolesButtonMixin,
      initEditRoleButtonMixin,
      initFilterRolesInputMixin,
      initNotificationsMixin,
    )(superclass) {
      async init() {
        await super.init?.();
      }
    },
);
