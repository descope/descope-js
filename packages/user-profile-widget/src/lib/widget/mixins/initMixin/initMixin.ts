import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { debuggerMixin, themeMixin } from '@descope/sdk-mixins';
import { initAvatarMixin } from './initComponentsMixins/initAvatarMixin';
import { initEmailUserAttrMixin } from './initComponentsMixins/initEmailUserAttrMixin';
import { initNameUserAttrMixin } from './initComponentsMixins/initNameUserAttrMixin';
import { initPhoneUserAttrMixin } from './initComponentsMixins/initPhoneUserAttrMixin';
import { initPasskeyUserAuthMethodMixin } from './initComponentsMixins/initPasskeyUserAuthMethodMixin';
import { initPasswordUserAuthMethodMixin } from './initComponentsMixins/initPasswordUserAuthMethodMixin';
import { initLogoutMixin } from './initComponentsMixins/initLogoutMixin';

export const initMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    /* @ts-ignore */
    class InitMixinClass extends compose(
      debuggerMixin,
      themeMixin,
      initAvatarMixin,
      initEmailUserAttrMixin,
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
