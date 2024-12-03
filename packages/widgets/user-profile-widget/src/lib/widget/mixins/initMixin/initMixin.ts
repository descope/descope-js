import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { debuggerMixin, themeMixin } from '@descope/sdk-mixins';
import { flowRedirectUrlMixin } from '../flowRedirectUrlMixin';
import { initAvatarMixin } from './initComponentsMixins/initAvatarMixin';
import { initEmailUserAttrMixin } from './initComponentsMixins/initEmailUserAttrMixin';
import { initLogoutMixin } from './initComponentsMixins/initLogoutMixin';
import { initNameUserAttrMixin } from './initComponentsMixins/initNameUserAttrMixin';
import { initPasskeyUserAuthMethodMixin } from './initComponentsMixins/initPasskeyUserAuthMethodMixin';
import { initPasswordUserAuthMethodMixin } from './initComponentsMixins/initPasswordUserAuthMethodMixin';
import { initPhoneUserAttrMixin } from './initComponentsMixins/initPhoneUserAttrMixin';
import { initUserCustomAttributesMixin } from './initComponentsMixins/initUserCustomAttributesMixin';

export const initMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    /* @ts-ignore */
    class InitMixinClass extends compose(
      debuggerMixin,
      themeMixin,
      flowRedirectUrlMixin, // This mixin must be before all other mixins that loads flows
      initUserCustomAttributesMixin,
      initEmailUserAttrMixin,
      initAvatarMixin,
      initNameUserAttrMixin,
      initPhoneUserAttrMixin,
      initPasskeyUserAuthMethodMixin,
      initPasswordUserAuthMethodMixin,
      initLogoutMixin,
    )(superclass) {
      async init() {
        await super.init?.();
      }
    },
);
