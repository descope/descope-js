import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { debuggerMixin, themeMixin } from '@descope/sdk-mixins';
import { initAccessKeysTableMixin } from './initComponentsMixins/initAccessKeysTableMixin';
import { initActivateAccessKeysButtonMixin } from './initComponentsMixins/initActivateAccessKeysButtonMixin';
import { initCreateAccessKeyButtonMixin } from './initComponentsMixins/initCreateAccessKeyButtonMixin';
import { initDeactivateAccessKeysButtonMixin } from './initComponentsMixins/initDeactivateAccessKeysButtonMixin';
import { initDeleteAccessKeysButtonMixin } from './initComponentsMixins/initDeleteAccessKeysButtonMixin';
import { initFilterAccessKeysInputMixin } from './initComponentsMixins/initFilterAccessKeysInputMixin';
import { initNotificationsMixin } from './initComponentsMixins/initNotificationsMixin';

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
