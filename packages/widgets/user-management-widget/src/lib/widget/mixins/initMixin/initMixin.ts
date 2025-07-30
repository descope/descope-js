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
import { initResetPasswordButtonMixin } from './initComponentsMixins/initResetPasswordButtonMixin';
import { initGenericFlowButtonMixin } from './initComponentsMixins/initGenericFlowButtonMixin';
import { flowRedirectUrlMixin } from '../flowRedirectUrlMixin';

export const initMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) => {
    // Compose only up to 13 mixins, so we split into two compose calls
    const BaseClass = compose(
      debuggerMixin,
      themeMixin,
      flowRedirectUrlMixin, // This mixin must be before all other mixins that loads flows
      initUsersTableMixin,
      initCreateUserButtonMixin,
      initDeleteUsersButtonMixin,
      initEditUserButtonMixin,
      initEnableUserButtonMixin,
      initDisableUserButtonMixin,
      initResetPasswordButtonMixin,
      initRemovePasskeyButtonMixin,
      initFilterUsersInputMixin,
    )(superclass);

    const FinalClass = compose(
      initNotificationsMixin,
      initGenericFlowButtonMixin,
    )(BaseClass);

    return class InitMixinClass extends FinalClass {
      async init() {
        await super.init?.();
      }
    };
  },
);
