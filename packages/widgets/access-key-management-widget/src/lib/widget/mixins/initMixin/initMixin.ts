import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  componentsConditionsMixin,
  debuggerMixin,
  themeMixin,
} from '@descope/sdk-mixins';
import { initAccessKeysTableMixin } from './initComponentsMixins/initAccessKeysTableMixin';
import { initActivateAccessKeysButtonMixin } from './initComponentsMixins/initActivateAccessKeysButtonMixin';
import { initCreateAccessKeyButtonMixin } from './initComponentsMixins/initCreateAccessKeyButtonMixin';
import { initDeactivateAccessKeysButtonMixin } from './initComponentsMixins/initDeactivateAccessKeysButtonMixin';
import { initDeleteAccessKeysButtonMixin } from './initComponentsMixins/initDeleteAccessKeysButtonMixin';
import { initFilterAccessKeysInputMixin } from './initComponentsMixins/initFilterAccessKeysInputMixin';
import { initNotificationsMixin } from './initComponentsMixins/initNotificationsMixin';
import { initRotateAccessKeyButtonMixin } from './initComponentsMixins/initRotateAccessKeyButtonMixin';

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
      initRotateAccessKeyButtonMixin,
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
