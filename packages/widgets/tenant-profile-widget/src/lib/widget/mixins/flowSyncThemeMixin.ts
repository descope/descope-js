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
        // eslint-disable-next-line no-param-reassign
        flowDriver.theme = this.theme;
        this.observeAttributes(['theme'], () => {
          // eslint-disable-next-line no-param-reassign
          flowDriver.theme = this.theme;
        });
      }
    },
);
