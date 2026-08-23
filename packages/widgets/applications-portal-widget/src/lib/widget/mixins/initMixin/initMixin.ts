import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import {
  componentsConditionsMixin,
  debuggerMixin,
  themeMixin,
} from '@descope/sdk-mixins';
import { initAppsListMixin } from './initComponentsMixins/initAppsListMixin';

export const initMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    // @ts-ignore
    class InitMixinClass extends compose(
      debuggerMixin,
      themeMixin,
      initAppsListMixin,
      // Last so its init wraps the widget render: it fires the conditions fetch
      // before render and applies the verdict in onWidgetRootReady.
      componentsConditionsMixin,
    )(superclass) {
      async init() {
        await super.init?.();
      }
    },
);
