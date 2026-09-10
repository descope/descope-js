import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  componentsConditionsMixin,
  debuggerMixin,
  themeMixin,
} from '@descope/sdk-mixins';
import { initCreateRoleButtonMixin } from './initComponentsMixins/initCreateRoleButtonMixin';
import { initDeleteRolesButtonMixin } from './initComponentsMixins/initDeleteRolesButtonMixin';
import { initDuplicateRoleButtonMixin } from './initComponentsMixins/initDuplicateRoleButtonMixin';
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
      initDuplicateRoleButtonMixin,
      initEditRoleButtonMixin,
      initFilterRolesInputMixin,
      initNotificationsMixin,
      // Last so its init wraps the widget render: it fires the conditions fetch
      // before render and applies the verdict in onWidgetRootReady.
      componentsConditionsMixin,
    )(superclass) {
      async init() {
        await super.init?.();
      }
    },
);
