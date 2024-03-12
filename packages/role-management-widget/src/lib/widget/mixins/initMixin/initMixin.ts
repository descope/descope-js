import { compose } from '../../../helpers/compose';
import { createSingletonMixin } from '../../../helpers/mixins';
import { debuggerMixin } from '../../../mixins/debuggerMixin';
import { themeMixin } from '../../../mixins/themeMixin';
import { initCreateRoleButtonMixin } from './initComponentsMixins/initCreateRoleButtonMixin';
import { initDeleteRolesButtonMixin } from './initComponentsMixins/initDeleteRolesButtonMixin';
import { initFilterRolesInputMixin } from './initComponentsMixins/initFilterRolesInputMixin';
import { initNotificationsMixin } from './initComponentsMixins/initNotificationsMixin';
import { initRolesTableMixin } from './initComponentsMixins/initRolesTableMixin';
import { initEditRoleButtonMixin } from './initComponentsMixins/initEditRolesButtonMixin';

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
