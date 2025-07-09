import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { debuggerMixin, themeMixin } from '@descope/sdk-mixins';
import { initOutboundAppsListMixin } from './initComponentsMixins/initOutboundAppsListMixin';

export const initMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    // @ts-ignore
    class InitMixinClass extends compose(
      debuggerMixin,
      themeMixin,
      initOutboundAppsListMixin,
    )(superclass) {
      async init() {
        await super.init?.();
      }
    },
);
