import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { debuggerMixin, themeMixin } from '@descope/sdk-mixins';
import { initCreateUserButtonMixin } from './initComponentsMixins/initCreateUserButtonMixin';
import { initDeleteUsersButtonMixin } from './initComponentsMixins/initDeleteUsersButtonMixin';
import { initDisableUserButtonMixin } from './initComponentsMixins/initDisableUserButtonMixin';
import { initEditUserButtonMixin } from './initComponentsMixins/initEditUsersButtonMixin';
import { initEnableUserButtonMixin } from './initComponentsMixins/initEnableUserButtonMixin';
import { initFilterUsersInputMixin } from './initComponentsMixins/initFilterUsersInputMixin';
import { initNotificationsMixin } from './initComponentsMixins/initNotificationsMixin';
import { initRemovePasskeyButtonMixin } from './initComponentsMixins/initRemovePasskeyButtonMixin';
import { initUsersTableMixin } from './initComponentsMixins/initUsersTableMixin';

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
