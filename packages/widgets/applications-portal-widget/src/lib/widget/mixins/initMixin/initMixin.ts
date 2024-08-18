import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { debuggerMixin, themeMixin } from '@descope/sdk-mixins';
import { initSSOAppsGridMixin } from './initComponentsMixins/initSSOAppsGridMixin';

export const initMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    // @ts-ignore
    class InitMixinClass extends compose(
      debuggerMixin,
      themeMixin,
      initSSOAppsGridMixin,
    )(superclass) {
      async init() {
        await super.init?.();
      }
    },
);
