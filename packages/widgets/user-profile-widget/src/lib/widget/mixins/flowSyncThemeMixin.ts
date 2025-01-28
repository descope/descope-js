import { FlowDriver } from '@descope/sdk-component-drivers';
import { compose, createSingletonMixin } from '@descope/sdk-helpers';
import { observeAttributesMixin, themeMixin } from '@descope/sdk-mixins';

export const flowSyncThemeMixin = createSingletonMixin(
  <T extends CustomElementConstructor>(superclass: T) =>
    class FlowSyncThemeMixinClass extends compose(
      themeMixin,
      observeAttributesMixin,
    )(superclass) {
      syncFlowTheme(flowDriver: FlowDriver) {
        flowDriver.theme = this.theme;
        this.observeAttributes(['theme'], () => {
          flowDriver.theme = this.theme;
        });
      }
    },
);
