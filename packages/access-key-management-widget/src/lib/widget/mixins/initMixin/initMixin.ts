import { compose } from '../../../helpers/compose';
import { createSingletonMixin } from '../../../helpers/mixins';
import { debuggerMixin } from '../../../mixins/debuggerMixin';
import { themeMixin } from '../../../mixins/themeMixin';
import { initCreateAccessKeyButtonMixin } from './initComponentsMixins/initCreateAccessKeyButtonMixin';
import { initDeleteAccessKeysButtonMixin } from './initComponentsMixins/initDeleteAccessKeysButtonMixin';
import { initFilterAccessKeysInputMixin } from './initComponentsMixins/initFilterAccessKeysInputMixin';
import { initNotificationsMixin } from './initComponentsMixins/initNotificationsMixin';
import { initAccessKeysTableMixin } from './initComponentsMixins/initAccessKeysTableMixin';
import { initActivateAccessKeysButtonMixin } from './initComponentsMixins/initActivateAccessKeysButtonMixin';
import { initDeactivateAccessKeysButtonMixin } from './initComponentsMixins/initDeactivateAccessKeysButtonMixin';

export const initMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    // @ts-ignore
    class InitMixinClass extends compose(
      debuggerMixin,
      themeMixin,
      initAccessKeysTableMixin,
      initCreateAccessKeyButtonMixin,
      initDeleteAccessKeysButtonMixin,
      initFilterAccessKeysInputMixin,
      initActivateAccessKeysButtonMixin,
      initDeactivateAccessKeysButtonMixin,
      initNotificationsMixin,
    )(superclass) {
      async init() {
        await super.init?.();
      }
    },
);
