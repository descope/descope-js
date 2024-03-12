import { compose } from '../../../helpers/compose';
import { createSingletonMixin } from '../../../helpers/mixins';
import { debuggerMixin } from '../../../mixins/debuggerMixin';
import { themeMixin } from '../../../mixins/themeMixin';
import { initCreateUserButtonMixin } from './initComponentsMixins/initCreateUserButtonMixin';
import { initDeleteUsersButtonMixin } from './initComponentsMixins/initDeleteUsersButtonMixin';
import { initFilterUsersInputMixin } from './initComponentsMixins/initFilterUsersInputMixin';
import { initNotificationsMixin } from './initComponentsMixins/initNotificationsMixin';
import { initUsersTableMixin } from './initComponentsMixins/initUsersTableMixin';
import { initEditUserButtonMixin } from './initComponentsMixins/initEditUsersButtonMixin';
import { initEnableUserButtonMixin } from './initComponentsMixins/initEnableUserButtonMixin';
import { initDisableUserButtonMixin } from './initComponentsMixins/initDisableUserButtonMixin';
import { initRemovePasskeyButtonMixin } from './initComponentsMixins/initRemovePasskeyButtonMixin';

export const initMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    /* @ts-ignore */
    class InitMixinClass extends compose(
      debuggerMixin,
      themeMixin,
      initUsersTableMixin,
      initCreateUserButtonMixin,
      initDeleteUsersButtonMixin,
      initEditUserButtonMixin,
      initEnableUserButtonMixin,
      initDisableUserButtonMixin,
      initRemovePasskeyButtonMixin,
      initFilterUsersInputMixin,
      initNotificationsMixin,
    )(superclass) {
      async init() {
        await super.init?.();
      }
    },
);
