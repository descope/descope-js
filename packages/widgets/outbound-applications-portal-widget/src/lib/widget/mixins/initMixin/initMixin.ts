import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { debuggerMixin, themeMixin } from '@descope/sdk-mixins';
import { flowRedirectUrlMixin } from '../flowRedirectUrlMixin';
import { initOutboundAppsListMixin } from './initComponentsMixins/initOutboundAppsListMixin';
import { customAppsMixin } from './customAppsMixin';

export const initMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    // @ts-ignore
    class InitMixinClass extends compose(
      debuggerMixin,
      themeMixin,
      flowRedirectUrlMixin, // This mixin must be before all other mixins that loads flows
      customAppsMixin,
      initOutboundAppsListMixin,
    )(superclass) {
      async init() {
        await super.init?.();
      }
    },
);
