import { compose } from '../../../helpers/compose';
import { createSingletonMixin } from '../../../helpers/mixins';
import { debuggerMixin } from '../../../mixins/debuggerMixin';
import { themeMixin } from '../../../mixins/themeMixin';
import { initCreateUserButtonMixin } from './initComponentsMixins/initCreateUserButtonMixin';
import { initDeleteUsersButtonMixin } from './initComponentsMixins/initDeleteUsersButtonMixin';
import { initFilterUsersInputMixin } from './initComponentsMixins/initFilterUsersInputMixin';
import { initNotificationsMixin } from './initComponentsMixins/initNotificationsMixin';
import { initUsersTableMixin } from './initComponentsMixins/initUsersTableMixin';

export const initMixin = createSingletonMixin(<T extends CustomElementConstructor>(superclass: T) =>
  class InitMixinClass extends compose(
    debuggerMixin,
    themeMixin,
    initUsersTableMixin,
    initCreateUserButtonMixin,
    initDeleteUsersButtonMixin,
    initFilterUsersInputMixin,
    initNotificationsMixin,
  )(superclass) {

    async init() {
      await super.init?.();

      this.actions.searchUsers();
      this.actions.getCustomAttributes();
    }
  });

